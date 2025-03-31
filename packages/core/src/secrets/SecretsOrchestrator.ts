import type { PreparedEffect } from './providers/BaseProvider.js';
import { collectSecretManagers, validateSecretManagers, prepareSecretEffects } from './manager.js';
import type { KubricateConfig, BaseLogger } from '../types.js';
import type { SecretManager, SecretOptions } from './SecretManager.js';

export class SecretsOrchestrator {
  constructor(
    private config: KubricateConfig,
    private logger: BaseLogger
  ) {}

  async validate(): Promise<void> {
    this.logger.info('Collecting secret managers...');
    const managers = collectSecretManagers(this.config); // Return type MergedSecretManager
    this.logger.info('Validating secret managers...');
    await validateSecretManagers(managers);
  }

  async prepare(): Promise<PreparedEffect[]> {
    const managers = collectSecretManagers(this.config); // Return type MergedSecretManager
    return prepareSecretEffects(managers);
  }

  injectSecretsToProviders(): void {
    const managers = collectSecretManagers(this.config);

    for (const { name, stackName, secretManager } of Object.values(managers)) {
      this.injectStackSecrets(stackName, name, secretManager);
    }
  }

  private injectStackSecrets(stackName: string, managerName: string, secretManager: SecretManager): void {
    const secrets = secretManager.getSecrets();

    for (const [providerId, provider] of Object.entries(secretManager.getProviders())) {
      if ('setSecrets' in provider && typeof provider.setSecrets === 'function') {
        const filteredSecrets = this.filterSecretsByProvider(secrets, providerId, secretManager);
        provider.setSecrets(filteredSecrets);
        this.logger.debug(
          `Injected ${Object.keys(filteredSecrets).length} secrets into provider '${providerId}' in stack '${stackName}' (${managerName})`
        );
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

    for (const [key, entry] of Object.entries(secrets)) {
      const entryProvider = entry.provider ?? defaultProvider;
      if (entryProvider === providerId) {
        result[key] = entry;
      }
    }

    return result;
  }
}
