import c from 'ansis';
import { MARK_CHECK, MARK_ERROR, MARK_INFO, MARK_NODE } from '../constant.js';
import { getClassName } from '../utils.js';
import { getConfig, getMatchConfigFile, LoadConfigOptions } from '../load-config.js';
import { stringify as yamlStringify } from 'yaml';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface GenerateCommandOptions extends LoadConfigOptions {
  outDir: string;
}

export class GenerateCommand {
  constructor(private options: GenerateCommandOptions) { }

  async execute() {
    console.log(c.bold('Executing: Generating Kubricate stacks for Kubernetes...'));

    if (!this.options.config) {
      console.log(
        `${MARK_INFO} No config file provided. Falling back to default: '${getMatchConfigFile()}'`
      );
    } else {
      console.log(`${MARK_INFO} Using config file: ${this.options.config}`);
    }
    console.log(`${MARK_INFO} Root directory: ${this.options.root}`);
    console.log(`${MARK_INFO} Output directory: ${this.options.outDir}`);

    const config = await getConfig(this.options);
    if (!config) {
      console.log(c.red`${MARK_ERROR} No config file found matching '${getMatchConfigFile()}'\n`);
      console.log(c.red`${MARK_ERROR} Please ensure a config file exists in the root directory:\n   ${this.options.root}\n`);
      console.log(c.red`${MARK_ERROR} If your config is located elsewhere, specify it using:\n   --root <dir>\n`);

      console.log(c.red`${MARK_ERROR} Or specify a config file using:\n   --config <file>\n`);
      console.log(c.red`${MARK_ERROR} Exiting...`);
      process.exit(1);
    }
    const stacksLength = Object.keys(config.stacks ?? {}).length;

    if (!config.stacks || stacksLength === 0) {
      console.log(c.red`${MARK_ERROR} No stacks found in config`);
      process.exit(1);
    }

    console.log(c.green`${MARK_CHECK} Found ${stacksLength} stacks in config`);
    for (const [name, stack] of Object.entries(config.stacks)) {
      console.log(c.blue`    ${MARK_NODE} ${name}: ${getClassName(stack)}`);
    }

    console.log('');
    console.log('---------------------');
    console.log(c.bold`Generating Kubricate stacks...`);
    console.log('---------------------');

    let output = '';

    for (const [name, stack] of Object.entries(config.stacks)) {
      console.log(c.blue`${MARK_NODE} Generating stack: ${name}...`);
      for (const resource of stack.build()) {
        output += yamlStringify(resource);
        output += '---\n';
      }
      console.log(c.green`${MARK_CHECK} Successfully generated stack: ${name}`);
    }
    console.log(c.green`${MARK_CHECK} All stacks generated successfully`);

    const outputPath = path.join(this.options.outDir, 'stacks.yml');
    await fs.mkdir(this.options.outDir, { recursive: true });
    await fs.writeFile(outputPath, output);

    console.log('');
    console.log(`${MARK_INFO} YAML file successfully written to:\n   '${path.resolve(outputPath)}'\n`);

    console.info(c.green`${MARK_CHECK} Done!`);
  }
}
