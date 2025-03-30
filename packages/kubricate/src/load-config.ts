import { loadConfig } from 'unconfig';
import { MARK_CHECK } from './constant.js';
import type { KubricateConfig } from './config.js';
import c from 'ansis';

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

export const DEFAULT_CONFIG_NAME = 'kubricate.config';
// Allow all JS/TS file extensions except JSON
export const DEFAULT_CONFIG_EXTENSIONS = ['mts', 'cts', 'ts', 'mjs', 'cjs', 'js'];

export function getMatchConfigFile(): string {
  return `${DEFAULT_CONFIG_NAME}.{${DEFAULT_CONFIG_EXTENSIONS.join(',')}}`;
}

export async function getConfig(options: GlobalConfigOptions): Promise<KubricateConfig | undefined> {
  const result = await loadConfig<KubricateConfig>({
    cwd: options.root,
    sources: [
      {
        files: options.config || DEFAULT_CONFIG_NAME,
        // Allow all JS/TS file extensions except JSON
        extensions: DEFAULT_CONFIG_EXTENSIONS,
      },
    ],
    merge: false,
  });
  if (result.sources.length) console.log(c.green`${MARK_CHECK} Config loaded from ${result.sources.join(', ')}`);
  return result.config;
}
