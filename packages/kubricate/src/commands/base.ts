import { SecretsOrchestrator, type BaseLogger, type KubricateConfig } from '@kubricate/core';
import { getConfig, getMatchConfigFile } from '../load-config.js';
import type { GlobalConfigOptions } from '../types.js';

export class BaseCommand {
  protected config: KubricateConfig | undefined;
  protected orchestrator!: SecretsOrchestrator;

  constructor(
    protected options: GlobalConfigOptions,
    protected logger: BaseLogger
  ) {}

  protected injectLogger(config: KubricateConfig) {
    for (const stack of Object.values(config.stacks ?? {})) {
      stack.injectLogger(this.logger);
    }
  }

  protected async init() {
    const logger = this.logger;
    logger.debug('Initializing secrets orchestrator...');
    if (!this.config) {
      logger.debug('Loading configuration...');
      this.config = await getConfig(this.options);
      if (!this.config) {
        logger.error(`No config file found matching '${getMatchConfigFile()}'`);
        logger.error(`Please ensure a config file exists in the root directory:\n   ${this.options.root}`);
        logger.error(`If your config is located elsewhere, specify it using:\n   --root <dir>`);
        logger.error(`Or specify a config file using:\n   --config <file>`);
        logger.error(`Exiting...`);
        throw new Error('No config file found');
      }
      logger.debug('Configuration loaded: ' + JSON.stringify(this.config, null, 2));
      logger.debug('Injecting logger into stacks...');
      this.injectLogger(this.config);
      logger.debug('Injected logger into stacks.');
      logger.debug('Creating secrets orchestrator...');
      this.orchestrator = new SecretsOrchestrator(this.config, logger);
      logger.debug('Secrets orchestrator created.');
    }
    return {
      orchestrator: this.orchestrator,
      config: this.config,
    };
  }
}
