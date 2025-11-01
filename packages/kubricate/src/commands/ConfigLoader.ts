import path from 'node:path';

import c from 'ansis';

import { type BaseLogger } from '@kubricate/core';

import { ConfigMigrator } from '../domain/ConfigMigrator.js';
import { getConfig, getMatchConfigFile } from '../internal/load-config.js';
import type { GlobalConfigOptions } from '../internal/types.js';
import { validateId, verboseCliConfig, type Subcommand } from '../internal/utils.js';
import { SecretsOrchestrator } from '../secret/index.js';
import type { KubricateConfig } from '../types.js';

interface InitializeOptions<CommandOptions> {
  subject: Subcommand;
  commandOptions: CommandOptions;
  processConfig?: (config: KubricateConfig, commandOptions: CommandOptions, logger: BaseLogger) => BaseLogger;
}

export class ConfigLoader {
  constructor(
    protected options: GlobalConfigOptions,
    protected logger: BaseLogger
  ) {}

  /**
   * Initialize everything needed to run the command
   */
  // public async initialize<CommandOptions extends Record<string, unknown>>(options: InitializeOptions<CommandOptions>) {
  //   const { subject, commandOptions, processConfig } = options;
  //   verboseCliConfig(commandOptions, this.logger, subject);
  //   const config = await this.load();
  //   let logger = commandOptions.logger as BaseLogger | undefined ?? new ConsoleLogger();
  //   console.log(`this.logger Level: ${this.logger.level}`);
  //   console.log(`logger Level: ${logger.level}`);
  //   if (processConfig) {
  //     logger = processConfig(config, commandOptions, logger);
  //   }
  //   this.setLogger(logger);
  //   console.log(`this.logger Level: ${this.logger.level}`);
  //   console.log(`logger Level: ${logger.level}`);
  //   this.showVersion();
  //   const orchestrator = await this.prepare(config);
  //   return {
  //     config,
  //     orchestrator,
  //   }
  // }

  public async initialize<CommandOptions extends Record<string, unknown>>(options: InitializeOptions<CommandOptions>) {
    const { subject, commandOptions } = options;
    verboseCliConfig(commandOptions, this.logger, subject);
    const config = await this.load();
    this.showVersion();
    const orchestrator = await this.prepare(config);
    return {
      config,
      orchestrator,
    };
  }

  public showVersion() {
    this.logger.log('\n' + c.bold(c.blue`kubricate`) + ` v${this.options.version}\n`);
  }

  public setLogger(logger: BaseLogger) {
    this.logger = logger;
  }

  protected injectLogger(config: KubricateConfig) {
    for (const stack of Object.values(config.stacks ?? {})) {
      stack.injectLogger(this.logger);
    }
  }

  private validateStackId(config: KubricateConfig | undefined) {
    if (!config) return;
    for (const stackId of Object.keys(config.stacks ?? {})) {
      validateId(stackId, 'stackId');
    }
  }

  protected handleDeprecatedOptions(config: KubricateConfig | undefined): KubricateConfig {
    const migrator = new ConfigMigrator();
    const result = migrator.migrate(config);

    // Log any warnings from the migration
    result.warnings.forEach(warning => this.logger.warn(warning));

    return result.config;
  }

  public async load(): Promise<KubricateConfig> {
    const logger = this.logger;
    logger.debug('Initializing secrets orchestrator...');
    let config: KubricateConfig | undefined;
    logger.debug('Loading configuration...');
    config = await getConfig(this.options);
    config = this.handleDeprecatedOptions(config);
    if (!config) {
      logger.error(`No config file found matching '${getMatchConfigFile()}'`);
      logger.error(`Please ensure a config file exists in the root directory:\n   ${this.options.root}`);
      logger.error(`If your config is located elsewhere, specify it using:\n   --root <dir>`);
      logger.error(`Or specify a config file using:\n   --config <file>`);
      logger.error(`Exiting...`);
      throw new Error('No config file found');
    }
    this.validateStackId(config);
    logger.debug('Validated Stack Ids');
    logger.debug('Configuration loaded: ' + JSON.stringify(config, null, 2));
    return config;
  }

  public async prepare(config: KubricateConfig) {
    const logger = this.logger;
    logger.debug('Injecting logger into stacks...');
    this.injectLogger(config);
    logger.debug('Injected logger into stacks.');
    logger.debug('Creating secrets orchestrator...');
    const workingDir = this.options.root ? path.resolve(this.options.root) : undefined;
    const orchestrator = SecretsOrchestrator.create({
      config,
      logger,
      effectOptions: { workingDir },
    });
    logger.debug('Secrets orchestrator created.');

    return orchestrator;
  }
}
