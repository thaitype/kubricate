import type { ConsoleLogger } from './logger.js';

export interface GlobalConfigOptions {
  /**
   * Working directory to load the config from.
   * This is the directory where the config file is located.
   * If not specified, the current working directory will be used.
   *
   * @default process.cwd()
   */
  root?: string;
  /**
   * Config file name to load.
   * If not specified, the default config file name will be used.
   *
   * @default 'kubricate.config'
   */
  config?: string;

  verbose?: boolean;
  silent?: boolean;
  /**
   * Enable verbose output.
   * This will enable debug logging and show more information in the output.
   * If not specified, the default log level will be used.
   *
   * @default ConsoleLogger.LogLevel.INFO
   */
  logger?: ConsoleLogger;
  /**
   * Version of the CLI.
   */
  version?: string;

  /**
   * Dry run mode.
   * If set to true, the CLI will not execute any commands,
   * but will print what would be done.
   *
   * @default false
   */
  dryRun?: boolean;
}
