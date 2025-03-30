import type { PreparedEffect } from './providers/BaseProvider.js';
import { collectSecretManagers, validateSecretManagers, prepareSecretEffects } from './manager.js';
import type { KubricateConfig, BaseLogger } from '../types.js';

export class SecretsOrchestrator {
  constructor(
    private config: KubricateConfig,
    private logger: BaseLogger
  ) {}

  async validate(): Promise<void> {
    this.logger.info('Validating secrets configuration...');
    const managers = collectSecretManagers(this.config);
    await validateSecretManagers(managers);
    this.logger.info('All secret managers validated successfully.');
  }

  async prepare(): Promise<PreparedEffect[]> {
    const managers = collectSecretManagers(this.config);
    return prepareSecretEffects(managers);
  }
}
