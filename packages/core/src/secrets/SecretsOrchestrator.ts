import type { PreparedEffect } from './providers/BaseProvider.js';
import { collectSecretManagers, validateSecretManagers, prepareSecretEffects } from './manager.js';
import type { KubricateConfig, BaseLogger } from '../types.js';
import type { SecretManager, SecretOptions } from './SecretManager.js';
import type { EffectsOptions } from './manager.js';

export class SecretsOrchestrator {
  constructor(
    private config: KubricateConfig,
    private effectOptions: EffectsOptions,
    private logger: BaseLogger
  ) { }

  async validate(): Promise<void> {
    this.logger.info('Collecting secret managers...');
    const managers = collectSecretManagers(this.config);
    this.logger.debug(`Found ${Object.keys(managers).length} secret managers`);

    this.logger.info('Validating secret managers...');
    await validateSecretManagers(managers, this.effectOptions);
    this.logger.debug('Secret managers validated successfully');
  }

  async prepare(): Promise<PreparedEffect[]> {
    this.logger.debug('Preparing secret effects...');
    const managers = collectSecretManagers(this.config);
    this.logger.debug(`Preparing secrets for ${Object.keys(managers).length} managers`);
    return prepareSecretEffects(managers, this.effectOptions);
  }

  injectSecretsToProviders(): void {
    const managers = collectSecretManagers(this.config);
    this.logger.debug(`Injecting secrets for ${Object.keys(managers).length} secret managers`);

    for (const { name, stackName, secretManager } of Object.values(managers)) {
      this.logger.debug(`Injecting secrets for stack: ${stackName}, manager: ${name}`);
      this.injectStackSecrets(stackName, secretManager);
    }

    this.logger.debug('All secrets injected into providers');
  }

  private injectStackSecrets(stackName: string, secretManager: SecretManager): void {
    const secrets = secretManager.getSecrets();
    this.logger.debug(`Stack '${stackName}' has ${Object.keys(secrets).length} secrets`);

    for (const [providerId, provider] of Object.entries(secretManager.getProviders())) {
      this.logger.debug(`Checking provider '${providerId}' for injection support`);
      if ('setSecrets' in provider && typeof provider.setSecrets === 'function') {
        const filteredSecrets = this.filterSecretsByProvider(secrets, providerId, secretManager);
        this.logger.debug(`Injecting ${Object.keys(filteredSecrets).length} secrets into provider '${providerId}'`);
        provider.setSecrets(filteredSecrets);
      }
    }
  }

  private filterSecretsByProvider(
    secrets: Record<string, SecretOptions>,
    providerId: string,
    secretManager: SecretManager
  ): Record<string, SecretOptions> {
    const result: Record<string, SecretOptions> = {};
    const defaultProvider = secretManager.getDefaultProvider();
    this.logger.debug(`Filtering secrets for provider '${providerId}' (default: ${defaultProvider})`);

    for (const [key, entry] of Object.entries(secrets)) {
      const entryProvider = entry.provider ?? defaultProvider;
      if (entryProvider === providerId) {
        result[key] = entry;
      }
    }

    this.logger.debug(`Filtered ${Object.keys(result).length} secrets for provider '${providerId}'`);
    return result;
  }
}
