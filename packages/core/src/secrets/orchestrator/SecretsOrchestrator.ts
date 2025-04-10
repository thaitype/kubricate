import type { BaseLogger } from '../../types.js';
import type { BaseProvider, PreparedEffect } from '../providers/BaseProvider.js';
import type { SecretValue } from '../types.js';
import { SecretManagerEngine, type MergedSecretManager } from './SecretManagerEngine.js';
import { SecretMergeEngine, type SecretOrigin } from './SecretMergeEngine.js';
import type { SecretsOrchestratorOptions } from './types.js';

interface ResolvedSecret {
  key: string;
  value: SecretValue;
  providerName: string;
  stackName: string;
  managerName: string;
}

type PreparedEffectWithMeta = PreparedEffect & {
  providerName: string;
  secretType: string;
  identifier: string;
}

export class SecretsOrchestrator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private providerCache = new Map<string, any>();

  constructor(private engine: SecretManagerEngine, private logger: BaseLogger) { }

  /**
   * Factory method to create a SecretsOrchestrator instance from options.
   */
  static create(options: SecretsOrchestratorOptions): SecretsOrchestrator {
    const engine = new SecretManagerEngine(options);
    return new SecretsOrchestrator(engine, options.logger);
  }

  /**
   * Validates all secret managers by resolving and loading all declared secrets.
   * Ensures secret loaders are configured correctly and values can be fetched.
   *
   * @remarks
   * Used by: `kubricate secret validate`
   *
   * @description
   * Ensures each secret manager is correctly configured by:
   * - Collecting all managers from config
   * - Resolving loaders
   * - Attempting to load each secret once
   * Logs debug information throughout for traceability.
   *
   * @returns Resolves when all managers validate without throwing.
   *
   * @throws If a loader fails or a secret cannot be loaded.
   */
  async validate(): Promise<void> {
    const managers = this.engine.collect();
    await this.engine.validate(managers);
  }

  /**
   * Generates a list of provider-ready effects by:
   * - Loading all secrets
   * - Merging them across levels (stack, manager, etc.)
   * - Preparing Kubernetes-ready manifests
   * - Merging manifests (e.g., same secret name)
   *
   * @remarks
   * Used by: `kubricate secret apply`
   *
   * @description
   *
   * @returns A list of prepared secret effects
   *
   * @throws If loading or provider preparation fails
   */
  async apply(): Promise<PreparedEffect[]> {
    const managers = this.engine.collect();

    // 1. Load and resolve all secrets
    const resolvedSecrets = await this.loadSecretsFromManagers(managers);

    // 2. Prepare raw effects using each provider
    const rawEffects = this.prepareEffects(resolvedSecrets);

    // 3. Merge grouped effects by provider
    return this.mergePreparedEffects(rawEffects);
  }

  private async loadSecretsFromManagers(managers: MergedSecretManager): Promise<ResolvedSecret[]> {
    const resolved: ResolvedSecret[] = [];

    for (const entry of Object.values(managers)) {
      const secrets = entry.secretManager.getSecrets();
      const loaded = await this.engine.loadSecrets(entry.secretManager, secrets);

      for (const [key, value] of Object.entries(loaded)) {
        const secretDef = secrets[key];
        resolved.push({
          key,
          value,
          providerName: String(secretDef.provider),
          stackName: entry.stackName,
          managerName: entry.name,
        });
      }
    }

    return resolved;
  }

  private prepareEffects(resolvedSecrets: ResolvedSecret[]): PreparedEffectWithMeta[] {
    return resolvedSecrets.flatMap(secret => {
      const provider = this.resolveProviderByName(secret.providerName);
      const effects = provider.prepare(secret.key, secret.value);

      return effects.map(effect => ({
        ...effect,
        providerName: provider.name!,
        secretType: provider.secretType ?? provider.constructor.name,
        identifier: provider.getEffectIdentifier?.(effect) ?? 'no-id',
      }));
    });
  }

  private mergePreparedEffects(effects: PreparedEffectWithMeta[]): PreparedEffect[] {
    const grouped = new Map<string, PreparedEffectWithMeta[]>();

    for (const effect of effects) {
      const key = `${effect.secretType}:${effect.identifier}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(effect);
    }

    const merged: PreparedEffect[] = [];

    for (const [mergeKey, group] of grouped.entries()) {
      const providerName = group[0].providerName;
      const provider = this.resolveProviderByName(providerName);

      if (group.length > 1 && !provider.allowMerge) {
        throw new Error(`[merge:error] Provider "${providerName}" does not allow merging for identifier "${mergeKey}"`);
      }
      // TODO: Handle case where provider does not implement mergeSecrets()
      if (typeof provider.mergeSecrets !== 'function') {
        throw new Error(`[merge:error] Provider "${providerName}" does not implement mergeSecrets() for identifier "${mergeKey}"`);
      }


      const strategy = SecretMergeEngine.resolveStrategyForLevel('providerLevel', this.engine.options.config.secrets);

      // detect conflict
      if (group.length > 1) {
        if (!provider.allowMerge) {
          throw new Error(`[merge:error] Provider "${providerName}" does not allow merging for identifier "${mergeKey}"`);
        }

        if (strategy === 'error') {
          throw new Error(`[merge:error:providerLevel] Duplicate resource identifier "${mergeKey}" from ${[...new Set(group.map(g => g.providerName))].join(' and ')}`);
        }

        if (strategy === 'overwrite') {
          this.logger.warn(`[merge:overwrite:providerLevel] Overwriting "${mergeKey}" with latest value`);
          // optionally reduce to one value
          group.splice(0, group.length - 1); // keep only last
        }

        // autoMerge — do nothing
      }


      merged.push(...provider.mergeSecrets(group));
    }

    return merged;
  }


  /**
   * Resolves a provider instance from its name by scanning all SecretManagers.
   * Caches resolved providers for performance.
   *
   * @throws If the provider name is not found in any manager
   */
  private resolveProviderByName(providerName: string): BaseProvider {
    if (this.providerCache.has(providerName)) {
      return this.providerCache.get(providerName);
    }

    for (const entry of Object.values(this.engine.collect())) {
      const secrets = entry.secretManager.getSecrets();
      this.logger.debug(`[SecretsOrchestrator] Looking for provider "${providerName}" in "${entry.name}"`);
      this.logger.debug(`[SecretsOrchestrator] Found secrets: ${JSON.stringify(secrets)}`);
      for (const { provider } of Object.values(secrets)) {
        if (provider === providerName) {
          const instance = entry.secretManager.resolveProvider(provider);
          this.providerCache.set(providerName, instance);
          return instance;
        }
      }
    }

    throw new Error(`[SecretsOrchestrator] Provider "${providerName}" not found in any registered SecretManager`);
  }


  /**
   * Loads and merges secret values from all secret managers using SecretsMergeEngine.
   */
  // private async loadAndMergeSecrets(managers: MergedSecretManager): Promise<Record<string, Record<string, SecretValue>>> {
  //   const allOrigins: SecretOrigin[] = [];

  //   for (const entry of Object.values(managers)) {
  //     const secrets = entry.secretManager.getSecrets();
  //     const raw = await this.engine.loadSecrets(entry.secretManager, secrets);

  //     const origins: SecretOrigin[] = Object.entries(raw).map(([key, value]) => ({
  //       key,
  //       value,
  //       source: 'loader',
  //       providerName: entry.name,
  //       managerName: entry.name,
  //       stackName: entry.stackName,
  //       originPath: [`stack:${entry.stackName}`, `manager:${entry.name}`],
  //     }));

  //     allOrigins.push(...origins);
  //   }

  //   const mergeEngine = new SecretMergeEngine(this.engine.options.logger, {
  //     config: this.engine.options.config,
  //     stackName: 'workspace',
  //     managerName: 'workspace',
  //   });

  //   const merged = mergeEngine.merge(allOrigins);

  //   // regroup merged into per-manager map
  //   const result: Record<string, Record<string, SecretValue>> = {};
  //   for (const entry of Object.values(managers)) {
  //     const prefix = `${entry.stackName}.${entry.name}`;
  //     const keys = Object.keys(entry.secretManager.getSecrets());
  //     result[prefix] = {};
  //     for (const key of keys) {
  //       if (merged[key] !== undefined) {
  //         result[prefix][key] = merged[key];
  //       }
  //     }
  //   }

  //   return result;
  // }

  // /**
  //  * Transforms merged secret values into provider-prepared effects.
  //  */
  // private prepareFromMergedSecrets(
  //   managers: MergedSecretManager,
  //   merged: Record<string, Record<string, SecretValue>>
  // ): PreparedEffect[] {
  //   const effects: PreparedEffect[] = [];

  //   for (const entry of Object.values(managers)) {
  //     const secrets = entry.secretManager.getSecrets();
  //     const mergedSecrets = merged[`${entry.stackName}.${entry.name}`];

  //     for (const key of Object.keys(mergedSecrets)) {
  //       const provider = entry.secretManager.resolveProvider(secrets[key].provider);
  //       effects.push(...provider.prepare(key, mergedSecrets[key]));
  //     }
  //   }

  //   return effects;
  // }

  /**
   * Deduplicates and merges effects per provider by calling mergeSecrets().
   */
  // private mergeProviderEffects(effects: PreparedEffect[]): PreparedEffect[] {
  //   const grouped = new Map<string, PreparedEffect[]>();

  //   for (const effect of effects) {
  //     const providerName = effect.providerName;
  //     if (!providerName) {
  //       throw new Error(`[SecretsOrchestrator] Effect "${JSON.stringify(effect)}" has no provider name`);
  //     }
  //     const group = grouped.get(providerName) ?? [];
  //     group.push(effect);
  //     grouped.set(providerName, group);
  //   }

  //   const merged: PreparedEffect[] = [];

  //   for (const [providerName, group] of grouped.entries()) {
  //     const provider = this.resolveProviderByName(providerName);
  //     merged.push(...provider.mergeSecrets(group));
  //   }

  //   return merged;
  // }

}
