import type { PreparedEffect } from '../providers/BaseProvider.js';
import { collectSecretManagers, validateSecretManagers, prepareSecretEffects } from './manager.js';
import type { KubricateConfig, BaseLogger } from '../../types.js';
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

}
