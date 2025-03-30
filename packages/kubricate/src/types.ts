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
}
