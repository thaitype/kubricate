import { loadConfig } from 'unconfig';
import { MARK_CHECK, MARK_ERROR, MARK_INFO } from './constant.js';
import { KubricateConfig } from './config.js';
import c from 'ansis';

export interface LoadConfigOptions {
  root: string;
  config?: string;
}

export async function getConfig(options: LoadConfigOptions): Promise<KubricateConfig | undefined> {
  const result = await loadConfig<KubricateConfig>({
    cwd: options.root,
    sources: [
      {
        files: options.config || 'kubricate.config',
        // Allow all JS/TS file extensions except JSON
        extensions: ['mts', 'cts', 'ts', 'mjs', 'cjs', 'js'],
      },
    ],
    merge: false,
  });
  if (result.sources.length) console.log(c.green`${MARK_CHECK} Config loaded from ${result.sources.join(', ')}`);
  return result.config;
}
