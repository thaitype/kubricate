import c from 'ansis';
import { MARK_CHECK, MARK_ERROR, MARK_INFO, MARK_NODE } from '../constant.js';
import { getClassName } from '../utils.js';
import { getConfig, LoadConfigOptions } from '../load-config.js';
import { stringify as yamlStringify } from 'yaml'
import fs from 'node:fs/promises';
import path from 'node:path';

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

    console.log('---------------------');
    console.log(c.bold`Generating stacks...`);
    console.log('---------------------');

    let output = '';

    for(const [name, stack] of Object.entries(config.stacks)) {
      console.log(c.blue`${MARK_NODE} Generating stack ${name}...`);
      for(const resource of stack.build()){
        output += yamlStringify(resource);
        output += '---\n';
      }
      console.log(c.green`${MARK_CHECK} Stack ${name} generated successfully`);
    }
    console.log(c.green`${MARK_CHECK} All stacks generated successfully`);

    const outputPath = path.join(this.options.outDir, 'stacks.yml');
    await fs.mkdir(this.options.outDir, { recursive: true });
    await fs.writeFile(outputPath, output);

    console.log(`${MARK_INFO} Written stacks to '${path.resolve(outputPath)}'`);

    console.info(c.green`${MARK_CHECK} Done!`);

  }
}
