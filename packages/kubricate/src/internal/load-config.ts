import c from 'ansis';
import { loadConfig } from 'unconfig';

import { type BaseLogger } from '@kubricate/core';

import type { KubricateConfig } from '../types.js';
import type { GlobalConfigOptions } from './types.js';

import { MARK_CHECK } from './constant.js';
import { SilentLogger } from './logger.js';

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
