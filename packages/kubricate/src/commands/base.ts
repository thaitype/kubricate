import { SecretsOrchestrator, type BaseLogger, type KubricateConfig } from '@kubricate/core';
import { getConfig, getMatchConfigFile } from '../internal/load-config.js';
import type { GlobalConfigOptions } from '../internal/types.js';
import c from 'ansis';
import path from 'node:path';

export class BaseCommand {
  protected config: KubricateConfig | undefined;
  protected orchestrator!: SecretsOrchestrator;

  constructor(
    protected options: GlobalConfigOptions,
    protected logger: BaseLogger
  ) {
    this.showVersion();
  }

  protected injectLogger(config: KubricateConfig) {
    for (const stack of Object.values(config.stacks ?? {})) {
      stack.injectLogger(this.logger);
    }
  }

  protected showVersion() {
    console.log(c.blue`kubricate` + ` v${this.options.version}\n`);
  }

  protected handleDeprecatedSecretOptions(config: KubricateConfig | undefined): KubricateConfig | undefined {
    if (!config) return config;
    if (config.secrets && config.secret) {
      throw new Error(`Conflict between 'secret' and 'secrets' options. Please use 'secret' instead`);
    }
    if (config.secrets) {
      this.logger.warn(`The 'secrets' option is deprecated. Please use 'secret' instead.`);
    }
    if (config.secret) {
      config.secrets = config.secret;
    }
    return config;
  }

  protected async init() {
    const logger = this.logger;
    logger.debug('Initializing secrets orchestrator...');
    if (!this.config) {
      logger.debug('Loading configuration...');
      this.config = await getConfig(this.options);
      this.config = this.handleDeprecatedSecretOptions(this.config);
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
      const workingDir = this.options.root ? path.resolve(this.options.root) : undefined;
      this.orchestrator = SecretsOrchestrator.create({
        config: this.config,
        logger,
        effectOptions: { workingDir },
      });
      logger.debug('Secrets orchestrator created.');
    }
    return {
      orchestrator: this.orchestrator,
      config: this.config,
    };
  }
}
