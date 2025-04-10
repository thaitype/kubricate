import type { BaseLogger } from '../../types.js';
import type { BaseProvider, PreparedEffect } from '../providers/BaseProvider.js';
import type { SecretValue } from '../types.js';
import { SecretManagerEngine, type MergedSecretManager } from './SecretManagerEngine.js';
import type { ConfigMergeOptions, MergeLevel, MergeStrategy, SecretsOrchestratorOptions } from './types.js';

interface ResolvedSecret {
  key: string;
  value: SecretValue;
  providerName: string;
  stackName: string;
  managerName: string;
}

type PreparedEffectWithMeta = PreparedEffect & {
  providerName: string;
  stackName: string;
  managerName: string;
  secretType: string;
  identifier: string | undefined; // optional, depends on provider
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

    this.logOrchestratorContext(this.engine.options.config.secrets);

    // 1. Load and resolve all secrets
    const resolvedSecrets = await this.loadSecretsFromManagers(managers);

    // 2. Prepare raw effects using each provider
    const rawEffects = this.prepareEffects(resolvedSecrets);

    // 3. Merge grouped effects by provider
    return this.mergePreparedEffects(rawEffects);
  }

  private logOrchestratorContext(mergeOptions: ConfigMergeOptions | undefined): void {
    this.logger.info(`Using merge strategies:`);
    this.logger.info(`  - intraProvider: ${this.resolveStrategyForLevel('intraProvider', mergeOptions)}`);
    this.logger.info(`  - intraStack: ${this.resolveStrategyForLevel('intraStack', mergeOptions)}`);
    this.logger.info(`  - crossProvider: ${this.resolveStrategyForLevel('crossProvider', mergeOptions)}`);
    this.logger.info(`  - crossStack: ${this.resolveStrategyForLevel('crossStack', mergeOptions)}`);
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
        stackName: secret.stackName,
        managerName: secret.managerName,
        providerName: provider.name!,
        secretType: provider.secretType ?? provider.constructor.name,
        identifier: provider.getEffectIdentifier?.(effect),
      }));
    });
  }

  private mergePreparedEffects(effects: PreparedEffectWithMeta[]): PreparedEffect[] {
    const grouped = new Map<string, PreparedEffectWithMeta[]>();

    for (const effect of effects) {
      // TODO: [merge:key] use canonical identifier to avoid cross-provider collision
      // const key = `${effect.stackName}.${effect.managerName}.${effect.providerName}:${effect.secretType}:${effect.identifier}`;
      const key = `${effect.secretType}:${effect.identifier}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(effect);
    }

    const merged: PreparedEffect[] = [];

    for (const [mergeKey, group] of grouped.entries()) {
      const providerNames = new Set(group.map(e => e.providerName));
      const stackNames = new Set(group.map(e => e.stackName));
      const managerNames = new Set(group.map(e => e.managerName));

      const level: MergeLevel =
        stackNames.size > 1 ? 'crossStack' :
          managerNames.size > 1 ? 'intraStack' :
            providerNames.size > 1 ? 'crossProvider' :
              'intraProvider';

      const strategy = this.resolveStrategyForLevel(level, this.engine.options.config.secrets);
      const providerName = group[0].providerName;
      const provider = this.resolveProviderByName(providerName);

      // 🔒 Enforce identifier sanity
      if (!provider.getEffectIdentifier && group.length > 1) {
        throw new Error(
          `[merge:error] Provider "${providerName}" must implement getEffectIdentifier() to safely merge multiple effects (identifier: "${mergeKey}")`
        );
      }

      // 🔒 Enforce provider.allowMerge and strategy
      if (group.length > 1) {
        const sources = formatMergeSources(group);

        if (!provider.allowMerge) {
          throw new Error(
            `[merge:error] Provider "${providerName}" does not allow merging for identifier "${mergeKey}". Found in:\n  - ${sources.join('\n  - ')}`
          );
        }

        if (strategy === 'error') {
          throw new Error(
            `[merge:error:${level}] Duplicate resource identifier "${mergeKey}" detected in:\n  - ${sources.join('\n  - ')}`
          );
        }

        if (strategy === 'overwrite') {
          const dropped = sources.slice(0, -1);
          const kept = sources[sources.length - 1];
          this.logger.warn(
            `[merge:overwrite:${level}] Overwriting "${mergeKey}" — keeping ${kept}, dropped :\n  - ${dropped.join('\n  - ')}`
          );
          group.splice(0, group.length - 1); // keep only the last
        }

        // 'autoMerge' = no-op
      }

      if (typeof provider.mergeSecrets !== 'function') {
        throw new Error(`[merge:error] Provider "${providerName}" does not implement mergeSecrets()`);
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
   * Resolves the merge strategy for a given level using config or fallback defaults.
   */
  private resolveStrategyForLevel(
    level: MergeLevel,
    mergeOptions: ConfigMergeOptions | undefined
  ): MergeStrategy {
    const defaults: Record<MergeLevel, MergeStrategy> = {
      intraProvider: 'autoMerge',   // allow merging within same provider
      crossProvider: 'error',        // disallow cross-provider collision in same SecretManager
      intraStack: 'error',          // disallow between managers in same stack
      crossStack: 'error',      // disallow across stacks (hard boundary)
    };

    return mergeOptions?.merge?.[level] ?? defaults[level];
  }

}

function formatMergeSources(group: PreparedEffectWithMeta[]): string[] {
  return group.map(g => {
    const keys = g.secretName ?? 'unknown';
    return `Stack: ${g.stackName}, SecretManager: ${g.managerName}, Provider: ${g.providerName}, Keys: [${keys}]`;
  });
}