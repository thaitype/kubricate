import type { PreparedEffect } from './providers/BaseProvider.js';
import { collectSecretManagers, validateSecretManagers, prepareSecretEffects } from './manager.js';
import type { KubricateConfig, BaseLogger } from '../types.js';

export class SecretsOrchestrator {
  constructor(
    private config: KubricateConfig,
    private logger: BaseLogger
  ) {}

  async validate(): Promise<void> {
    this.logger.info('Collecting secret managers...');
    const managers = collectSecretManagers(this.config);
    this.logger.info('Validating secret managers...');
    await validateSecretManagers(managers);
  }

  async prepare(): Promise<PreparedEffect[]> {
    const managers = collectSecretManagers(this.config);
    return prepareSecretEffects(managers);
  }
}
