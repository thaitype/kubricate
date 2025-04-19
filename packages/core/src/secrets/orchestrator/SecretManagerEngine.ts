import { SecretManager, type SecretOptions } from '../SecretManager.js';
import type { PreparedEffect } from '../providers/BaseProvider.js';
import type { SecretValue } from '../types.js';
import type { SecretsOrchestratorOptions } from './types.js';

export type StackName = string;
export type SecretManagerName = string;

/**
 * MergedSecretManager maps SecretManager instances at the project level.
 * 
 * For now, Kubricate supports only one SecretManager per project (via config.secrets.manager),
 * so this structure holds exactly one manager under the 'default' key.
 */
export interface MergedSecretManager {
  [secretManagerName: string]: {
    /**
     * The name of the secret manager.
     * This is used to identify the secret manager in the project.
     */
    name: string;
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
  constructor(public readonly options: SecretsOrchestratorOptions) { }

  /**
   * Collect all SecretManager from kubricate configs
   */
  collect(): MergedSecretManager {
    const { config, logger } = this.options;

    logger.info('Collecting secret managers...');

    if(!config.secrets?.manager) {
      throw new Error('[SecretManagerEngine] No secret manager found. Please define "secrets.manager" in kubricate.config.ts.');
    }

    if (!(config.secrets?.manager instanceof SecretManager)) {
      throw new Error('[SecretManagerEngine] Invalid secret manager instance.');
    }

    return {
      default: {
        name: 'default',
        secretManager: config.secrets.manager,
      }
    } satisfies MergedSecretManager;
  }

  /**
   * Validate all connectors by attempting to load secrets and resolve their values.
   * Will throw if any secret can't be loaded.
   */
  async validate(managers: MergedSecretManager): Promise<void> {
    const { logger } = this.options;

    logger.info('Validating secret managers...');
    for (const entry of Object.values(managers)) {
      const secrets = entry.secretManager.getSecrets();
      await this.loadSecrets(entry.secretManager, secrets);
    }
    logger.debug('Secret managers validated successfully');
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
   * Load secrets from connectors, optionally returning the loaded values.
   * If `returnValues` is false, this acts as a validation-only step.
   */
  public async loadSecrets(
    secretManager: SecretManager,
    secrets: Record<string, SecretOptions>
  ): Promise<Record<string, SecretValue>> {
    const { effectOptions } = this.options;
    
    const resolved: Record<string, SecretValue> = {};
    const loaded = new Set<string>();

    for (const name of Object.keys(secrets)) {
      if (loaded.has(name)) continue;

      const connector = secretManager.resolveConnector(secrets[name].connector);

      // Set working directory into connector if not already set
      if (connector.getWorkingDir?.() === undefined && connector.setWorkingDir) {
        connector.setWorkingDir(effectOptions.workingDir);
      }

      // Load the secret
      await connector.load([name]);

      // Get the secret value
      // Throws if the secret was not previously loaded via `load()`
      resolved[name] = connector.get(name);

      loaded.add(name);
    }

    return resolved;
  }
}