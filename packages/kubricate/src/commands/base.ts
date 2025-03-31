import { SecretsOrchestrator, type BaseLogger, type KubricateConfig } from '@kubricate/core';
import { getConfig } from '../load-config.js';
import type { GlobalConfigOptions } from '../types.js';

export class BaseCommand {
  protected configLoaded = false;
  protected orchestrator!: SecretsOrchestrator;

  constructor(
    protected options: GlobalConfigOptions,
    protected logger: BaseLogger
  ) {}

  protected injectLogger(config: KubricateConfig) {
    for (const stack of Object.values(config.stacks ?? {})) {
      if (stack.logger) {
        stack.logger = this.logger;
      }
    }
  }

  protected async init(): Promise<SecretsOrchestrator> {
    this.logger.debug('Initializing secrets orchestrator...');
    if (!this.configLoaded) {
      this.logger.debug('Loading configuration...');
      const config = await getConfig(this.options);
      if (!config) {
        this.logger.error('No configuration found.');
        process.exit(1);
      }
      this.logger.debug('Configuration loaded: ' + JSON.stringify(config, null, 2));
      this.logger.debug('Injecting logger into stacks...');
      this.injectLogger(config);
      this.logger.debug('Injected logger into stacks.');
      this.logger.debug('Creating secrets orchestrator...');
      this.orchestrator = new SecretsOrchestrator(config, this.logger);
      this.logger.debug('Secrets orchestrator created.');
      this.configLoaded = true;
    }
    return this.orchestrator;
  }
}
