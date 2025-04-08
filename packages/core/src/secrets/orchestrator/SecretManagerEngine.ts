import type { BaseLogger, KubricateConfig } from '../../types.js';
import type { SecretManager, SecretOptions } from '../SecretManager.js';
import type { PreparedEffect } from '../providers/BaseProvider.js';
import type { SecretValue } from '../types.js';

export type StackName = string;
export type SecretManagerName = string;

export interface MergedSecretManager {
  [stackAndName: string]: {
    /**
     * The name of the secret manager.
     * This is used to identify the secret manager in the stack.
     *
     * However, it can duplicate when multiple stacks are used.
     */
    name: string;
    /**
     * Stack name where the secret manager is used.
     * This is used to identify the stack in the kubricate config.
     *
     * This value should be unique across all stacks.
     */
    stackName: string;
    /**
     * The secret manager instance.
     */
    secretManager: SecretManager;
  };
}

export interface EffectsOptions {
  workingDir?: string;
}


/**
 * SecretManagerEngine orchestrates loading, validating, and preparing secrets
 * across all stacks defined in the Kubricate config.
 */
export class SecretManagerEngine {
  constructor(
    private readonly config: KubricateConfig,
    private readonly options: EffectsOptions,
    private logger: BaseLogger
  ) { }

  /**
   * Collect all SecretManager instances across stacks in workspace
   */
  collect(): MergedSecretManager {
    this.logger.info('Collecting secret managers...');
    const result: MergedSecretManager = {};

    for (const [stackName, stack] of Object.entries(this.config.stacks ?? {})) {
      if (typeof stack.getSecretManagers !== 'function') {
        this.logger.warn(`Stack ${stackName} does not have a getSecretManagers method`);
        continue;
      }

      const managers = stack.getSecretManagers();
      for (const [name, secretManager] of Object.entries(managers)) {
        const id = `${stackName}.${name}`;
        if (!result[id]) {
          result[id] = { name, stackName, secretManager };
        }
      }
    }

    this.logger.debug(`Found ${Object.keys(result).length} secret managers`);

    return result;
  }

  /**
   * Validate all loaders by attempting to load secrets and resolve their values.
   * Will throw if any secret can't be loaded.
   */
  async validate(managers: MergedSecretManager): Promise<void> {
    this.logger.info('Validating secret managers...');
    for (const entry of Object.values(managers)) {
      const secrets = entry.secretManager.getSecrets();
      await this.loadSecrets(entry.secretManager, secrets);
    }
    this.logger.debug('Secret managers validated successfully');
  }

  /**
   * Prepare all effects (from providers) based on loaded secret values
   */
  async prepareEffects(managers: MergedSecretManager): Promise<PreparedEffect[]> {
    const effects: PreparedEffect[] = [];

    for (const entry of Object.values(managers)) {
      const secrets = entry.secretManager.getSecrets();
      const resolved = await this.loadSecrets(entry.secretManager, secrets);

      for (const name of Object.keys(secrets)) {
        const provider = entry.secretManager.resolveProvider(secrets[name].provider);
        effects.push(...provider.prepare(name, resolved[name]));
      }
    }

    return effects;
  }

  /**
   * Load secrets from loaders, optionally returning the loaded values.
   * If `returnValues` is false, this acts as a validation-only step.
   */
  private async loadSecrets(
    secretManager: SecretManager,
    secrets: Record<string, SecretOptions>
  ): Promise<Record<string, SecretValue>> {
    const resolved: Record<string, SecretValue> = {};
    const loaded = new Set<string>();

    for (const name of Object.keys(secrets)) {
      if (loaded.has(name)) continue;

      const loader = secretManager.resolveLoader(secrets[name].loader);

      // Set working directory into loader if not already set
      if (loader.getWorkingDir?.() === undefined && loader.setWorkingDir) {
        loader.setWorkingDir(this.options.workingDir);
      }

      // Load the secret
      await loader.load([name]);

      // Get the secret value
      // Throws if the secret was not previously loaded via `load()`
      resolved[name] = loader.get(name);

      loaded.add(name);
    }

    return resolved;
  }
}