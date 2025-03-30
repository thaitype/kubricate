import c from 'ansis';
import { MARK_NODE } from '../constant.js';
import { getClassName } from '../utils.js';
import { getConfig, getMatchConfigFile, type LoadConfigOptions } from '../load-config.js';
import { stringify as yamlStringify } from 'yaml';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ILogger } from '../logger.js';

export interface GenerateCommandOptions extends LoadConfigOptions {
  outDir: string;
}

export class GenerateCommand {
  constructor(
    private options: GenerateCommandOptions,
    private logger: ILogger
  ) {}

  async execute() {
    const logger = this.logger;
    logger.info('Executing: Generating Kubricate stacks for Kubernetes...');

    if (!this.options.config) {
      logger.info(`No config file provided. Falling back to default: '${getMatchConfigFile()}'`);
    } else {
      logger.info(`Using config file: ${this.options.config}`);
    }

    logger.info(`Root directory: ${this.options.root}`);
    logger.info(`Output directory: ${this.options.outDir}`);

    const config = await getConfig(this.options);
    if (!config) {
      logger.error(`No config file found matching '${getMatchConfigFile()}'`);
      logger.error(`Please ensure a config file exists in the root directory:\n   ${this.options.root}`);
      logger.error(`If your config is located elsewhere, specify it using:\n   --root <dir>`);
      logger.error(`Or specify a config file using:\n   --config <file>`);
      logger.error(`Exiting...`);
      process.exit(1);
    }

    const stacksLength = Object.keys(config.stacks ?? {}).length;

    if (!config.stacks || stacksLength === 0) {
      logger.error(`No stacks found in config`);
      process.exit(1);
    }

    logger.success(`Found ${stacksLength} stacks in config`);
    for (const [name, stack] of Object.entries(config.stacks)) {
      logger.info(c.blue`  ${MARK_NODE} ${name}: ${getClassName(stack)}`);
    }

    logger.log('');
    logger.log('---------------------');
    logger.log('Generating Kubricate stacks...');
    logger.log('---------------------');

    let output = '';

    for (const [name, stack] of Object.entries(config.stacks)) {
      logger.info(c.blue`${MARK_NODE} Generating stack: ${name}...`);
      for (const resource of stack.build()) {
        output += yamlStringify(resource);
        output += '---\n';
      }
      logger.success(`Successfully generated stack: ${name}`);
    }

    logger.success('All stacks generated successfully');

    const outputPath = path.join(this.options.root, this.options.outDir, 'stacks.yml');
    await fs.mkdir(this.options.outDir, { recursive: true });
    await fs.writeFile(outputPath, output);

    logger.log('');
    logger.info(`YAML file successfully written to:\n   '${path.resolve(outputPath)}'`);
    logger.success('Done!');
  }
}
