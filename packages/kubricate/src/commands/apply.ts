import { loadConfig } from 'unconfig';
import c from 'ansis';
import { MARK_CHECK, MARK_ERROR, MARK_INFO, MARK_NODE } from '../constant';
import { KubricateConfig } from '../config.js';
import { getClassName } from '../utils.js';

export interface ApplyCommandOptions {
  root: string;
  config?: string;
  outDir: string;
}

export class ApplyCommand {
  constructor(private options: ApplyCommandOptions) { }

  async execute() {
    console.log(c.bold('Executing kubricate apply stacks...'));

    if (!this.options.config) {
      console.log(`${MARK_INFO} No config file provided, using default config file which is 'kubricate.config.{js,ts,mjs,cjs}'`);
    } else {
      console.log(`${MARK_INFO} Using config file: ${this.options.config}`);
    }
    console.log(`${MARK_INFO} Root directory: ${this.options.root}`);
    console.log(`${MARK_INFO} Output directory: ${this.options.outDir}`);

    const config = await this.getConfig();
    const stacksLength = Object.keys(config.stacks ?? {}).length;

    if(!config.stacks || stacksLength === 0) {
      console.log(c.red`${MARK_ERROR} No stacks found in config`);
      process.exit(1);
    }

    console.log(c.green`${MARK_CHECK} Found ${stacksLength} stacks in config`);
    for(const [name, stack] of Object.entries(config.stacks)) {
      console.log(c.blue`    ${MARK_NODE} ${name}: ${getClassName(stack)}`);
    }

  }

  private async getConfig() {
    const result = await loadConfig<KubricateConfig>({
      cwd: this.options.root,
      sources: [
        {
          files: this.options.config || 'kubricate.config',
          // Allow all JS/TS file extensions except JSON
          extensions: ['mts', 'cts', 'ts', 'mjs', 'cjs', 'js'],
        },
      ],
      merge: false,
    });
    if (result.sources.length)
      console.log(c.green`${MARK_CHECK} Config loaded from ${result.sources.join(', ')}`);
    return result.config;
  }
}
