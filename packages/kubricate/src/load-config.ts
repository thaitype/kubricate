import { loadConfig } from 'unconfig';
import { MARK_CHECK } from './constant.js';
import c from 'ansis';
import type { GlobalConfigOptions } from './types.js';
import { SilentLogger, type BaseLogger, type KubricateConfig } from '@kubricate/core';

export const DEFAULT_CONFIG_NAME = 'kubricate.config';
// Allow all JS/TS file extensions except JSON
export const DEFAULT_CONFIG_EXTENSIONS = ['mts', 'cts', 'ts', 'mjs', 'cjs', 'js'];

export function getMatchConfigFile(): string {
  return `${DEFAULT_CONFIG_NAME}.{${DEFAULT_CONFIG_EXTENSIONS.join(',')}}`;
}

export async function getConfig(
  options: GlobalConfigOptions,
  logger: BaseLogger = new SilentLogger()
): Promise<KubricateConfig | undefined> {
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
  if (result.sources.length) logger.log(c.green`${MARK_CHECK} Config loaded from ${result.sources.join(', ')}`);
  return result.config;
}
