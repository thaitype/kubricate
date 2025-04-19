import type { BaseLogger, KubricateConfig } from '../../types.js';
import type { BaseProvider, PreparedEffect } from '../providers/BaseProvider.js';
import type { SecretValue } from '../types.js';
import { SecretManagerEngine, type MergedSecretManager } from './SecretManagerEngine.js';
import type { ConfigConflictOptions, ConflictLevel, ConflictStrategy, SecretsOrchestratorOptions } from './types.js';

interface ResolvedSecret {
  key: string;
  value: SecretValue;
  providerName: string;
  managerName: string;
}

type PreparedEffectWithMeta = PreparedEffect & {
  providerName: string;
  managerName: string;
  secretType: string;
  identifier: string | undefined; // optional, depends on provider
}

/**
 * SecretsOrchestrator
 *
 * @description
 * Central orchestration engine responsible for:
 * - Validating secret configuration and managers
 * - Loading and resolving all declared secrets
 * - Preparing provider-specific effects
 * - Applying conflict resolution strategies (intraProvider, crossProvider, intraStack)
 * - Producing a fully merged, finalized list of secret effects ready for output (e.g., YAML, JSON, etc.)
 *
 * @remarks
 * - Acts as the internal core behind `kubricate secret apply`.
 * - Ensures predictable, auditable, and conflict-safe secret generation.
 * - Delegates provider-specific behavior to registered providers (e.g., mergeSecrets, prepare).
 *
 * @usage
 * Typically called via:
 * 
 * ```ts
 * const orchestrator = SecretsOrchestrator.create(options);
 * const effects = await orchestrator.apply();
 * ```
 *
 * @throws {Error}
 * If configuration, validation, or merging fails at any stage.
 */
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
   * Validates the project configuration and all registered secret managers.
   *
   * @remarks
   * This is automatically called by commands like `kubricate secret apply` and `kubricate secret validate`.
   *
   * @description
   * Performs full validation across:
   * - Configuration schema (e.g., strictConflictMode rules, secret manager presence)
   * - SecretManager instances and their attached connectors
   * - Ensures all declared secrets can be loaded without error
   *
   * Logs important validation steps for traceability.
   *
   * @returns {Promise<MergedSecretManager>} A fully validated set of collected secret managers.
   *
   * @throws {Error} 
   * - If a configuration violation is detected (e.g., invalid strictConflictMode usage).
   * - If a SecretManager or connector fails to validate or load secrets.
   */
  async validate(): Promise<MergedSecretManager> {
    // 1. Validate config options (e.g., strictConflictMode)
    this.validateConfig(this.engine.options.config);

    // 2. Validate secret managers and connectors
    const managers = this.engine.collect();
    await this.engine.validate(managers);
    return managers;
  }

  /**
   * Prepares a fully validated and merged set of provider-ready secret effects.
   *
   * @remarks
   * This is the core orchestration method called by commands like `kubricate secret apply`.
   *
   * @description
   * Executes the full secret orchestration lifecycle:
   * - Validates project configuration and all secret managers
   * - Loads and resolves all secrets across managers
   * - Prepares raw provider effects for each secret
   * - Merges effects according to conflict strategies (intraProvider, crossProvider, etc.)
   *
   * Logs context and important processing steps for debugging and traceability.
   *
   * @returns {Promise<PreparedEffect[]>} A list of finalized secret effects ready for output (e.g., Kubernetes manifests).
   *
   * @throws {Error}
   * - If configuration validation fails (e.g., strictConflictMode violations).
   * - If loading or preparing secrets fails.
   * - If conflict resolution encounters an unrecoverable error (based on config).
   */
  async apply(): Promise<PreparedEffect[]> {
    const managers = await this.validate();

    this.logOrchestratorContext(this.engine.options.config.secrets);

    // 1. Load and resolve all secrets
    const resolvedSecrets = await this.loadSecretsFromManagers(managers);

    // 2. Prepare raw effects using each provider
    const rawEffects = this.prepareEffects(resolvedSecrets);

    // 3. Merge grouped effects by provider
    return this.mergePreparedEffects(rawEffects);
  }

  private logOrchestratorContext(mergeOptions: ConfigConflictOptions | undefined): void {
    this.logger.info(`Using merge strategies:`);
    this.logger.info(`  - intraProvider: ${this.resolveStrategyForLevel('intraProvider', mergeOptions)}`);
    this.logger.info(`  - intraStack: ${this.resolveStrategyForLevel('intraStack', mergeOptions)}`);
    this.logger.info(`  - crossProvider: ${this.resolveStrategyForLevel('crossProvider', mergeOptions)}`);
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
      // TODO: [conflict:key] use canonical identifier to avoid cross-provider collision
      // const key = `${effect.stackName}.${effect.managerName}.${effect.providerName}:${effect.secretType}:${effect.identifier}`;
      const key = `${effect.secretType}:${effect.identifier}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(effect);
    }

    const merged: PreparedEffect[] = [];

    for (const [mergeKey, group] of grouped.entries()) {
      const providerNames = new Set(group.map(e => e.providerName));
      const managerNames = new Set(group.map(e => e.managerName));

      const level: ConflictLevel =
        managerNames.size > 1 ? 'intraStack' :
          providerNames.size > 1 ? 'crossProvider' :
            'intraProvider';

      const strategy = this.resolveStrategyForLevel(level, this.engine.options.config.secrets);
      const providerName = group[0].providerName;
      const provider = this.resolveProviderByName(providerName);

      // 🔒 Enforce identifier sanity
      if (!provider.getEffectIdentifier && group.length > 1) {
        throw new Error(
          `[conflict:error] Provider "${providerName}" must implement getEffectIdentifier() to safely merge multiple effects (identifier: "${mergeKey}")`
        );
      }

      // 🔒 Enforce provider.allowMerge and strategy
      if (group.length > 1) {
        const sources = formatMergeSources(group);

        if (!provider.allowMerge) {
          throw new Error(
            `[conflict:error] Provider "${providerName}" does not allow merging for identifier "${mergeKey}". Found in:\n  - ${sources.join('\n  - ')}`
          );
        }

        if (strategy === 'error') {
          throw new Error(
            `[conflict:error:${level}] Duplicate resource identifier "${mergeKey}" detected in:\n  - ${sources.join('\n  - ')}`
          );
        }

        if (strategy === 'overwrite') {
          const dropped = sources.slice(0, -1);
          const kept = sources[sources.length - 1];
          this.logger.warn(
            `[conflict:overwrite:${level}] Overwriting "${mergeKey}" — keeping ${kept}, dropped :\n  - ${dropped.join('\n  - ')}`
          );
          group.splice(0, group.length - 1); // keep only the last
        }

        // 'autoMerge' = no-op
      }

      if (typeof provider.mergeSecrets !== 'function') {
        throw new Error(`[conflict:error] Provider "${providerName}" does not implement mergeSecrets()`);
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
    level: ConflictLevel,
    conflictOptions: ConfigConflictOptions | undefined
  ): ConflictStrategy {

    const strict = conflictOptions?.conflict?.strict ?? false;

    const defaults: Record<ConflictLevel, ConflictStrategy> = strict
      ? {
        intraProvider: 'error',    // no merging at all
        crossProvider: 'error',
        intraStack: 'error',
      }
      : {
        intraProvider: 'autoMerge', // default allows merging inside provider
        crossProvider: 'error',
        intraStack: 'error',
      };

    return conflictOptions?.conflict?.strategies?.[level] ?? defaults[level];
  }

  /**
   * Validates core secrets-related configuration inside the project config.
   *
   * @param config - The Kubricate project configuration object.
   *
   * @throws {Error} If the secret manager is missing or invalid.
   */
  private validateConfig(config: KubricateConfig): void {
    if (!config.secrets?.manager) {
      throw new Error('[config] No secret manager found. Please define "secrets.manager" in kubricate.config.ts.');
    }

    this.validateConflictOptions(config.secrets);
  }

  /**
   * Validates conflict resolution options, especially when `strictConflictMode` is enabled.
   *
   * - If `strictConflictMode` is true, all conflict strategies must be set to 'error'.
   * - Throws early if an invalid combination is detected.
   *
   * @param conflictOptions - The secret conflict configuration object.
   *
   * @throws {Error} If strict mode is enabled but a non-'error' strategy is found.
   */
  private validateConflictOptions(conflictOptions: ConfigConflictOptions | undefined) {
    if (!conflictOptions?.conflict?.strict) return;

    for (const [level, strategy] of Object.entries(conflictOptions.conflict?.strategies ?? {})) {
      if (strategy !== 'error') {
        throw new Error(
          `[config:strictConflictMode] Strategy for "${level}" must be "error" (found "${strategy}").`
        );
      }
    }
  }

}


function formatMergeSources(group: PreparedEffectWithMeta[]): string[] {
  return group.map(g => {
    const keys = g.secretName ?? 'unknown';
    return `SecretManager: ${g.managerName}, Provider: ${g.providerName}, Keys: [${keys}]`;
  });
}