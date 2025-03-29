import c from 'ansis';
import { MARK_CHECK, MARK_ERROR, MARK_INFO, MARK_NODE } from '../constant.js';
import { getClassName } from '../utils.js';
import { getConfig, LoadConfigOptions } from '../load-config.js';

export interface GenerateCommandOptions extends LoadConfigOptions {
  outDir: string;
}

export class GenerateCommand {
  constructor(private options: GenerateCommandOptions) { }

  async execute() {
    console.log(c.bold('Executing kubricate generates stacks...'));

    if (!this.options.config) {
      console.log(`${MARK_INFO} No config file provided, using default config file which is 'kubricate.config.{js,ts,mjs,cjs}'`);
    } else {
      console.log(`${MARK_INFO} Using config file: ${this.options.config}`);
    }
    console.log(`${MARK_INFO} Root directory: ${this.options.root}`);
    console.log(`${MARK_INFO} Output directory: ${this.options.outDir}`);

    const config = await getConfig(this.options);
    const stacksLength = Object.keys(config.stacks ?? {}).length;

    if(!config.stacks || stacksLength === 0) {
      console.log(c.red`${MARK_ERROR} No stacks found in config`);
      process.exit(1);
    }

    console.log(c.green`${MARK_CHECK} Found ${stacksLength} stacks in config`);
    for(const [name, stack] of Object.entries(config.stacks)) {
      console.log(c.blue`    ${MARK_NODE} ${name}: ${getClassName(stack)}`);
    }

    for(const [name, stack] of Object.entries(config.stacks)) {
      console.log(c.blue`${MARK_NODE} Generating stack ${name}...`);
      console.log(JSON.stringify(stack, null, 2));
      console.log('---')
      console.log(c.green`${MARK_CHECK} Stack ${name} generated successfully`);
    }
    console.log(c.green`${MARK_CHECK} All stacks generated successfully`);
    console.info(c.green`${MARK_CHECK} Done!`);

  }
}
