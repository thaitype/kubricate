import c from 'ansis';
import { MARK_CHECK, MARK_NODE } from '../constant.js';
import { getClassName } from '../utils.js';
import { stringify as yamlStringify } from 'yaml';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { GlobalConfigOptions } from '../types.js';
import type { BaseLogger } from '@kubricate/core';
import { BaseCommand } from './base.js';

export interface GenerateCommandOptions extends GlobalConfigOptions {
  outDir: string;
}

export class GenerateCommand extends BaseCommand {
  constructor(
    protected options: GenerateCommandOptions,
    protected logger: BaseLogger
  ) {
    super(options, logger);
  }

  async execute() {
    const logger = this.logger;
    logger.info('Generating stacks for Kubernetes...');
    const { config, orchestrator } = await this.init();

    const stacksLength = Object.keys(config.stacks ?? {}).length;

    if (!config.stacks || stacksLength === 0) {
      logger.error(`No stacks found in config`);
      process.exit(1);
    }

    logger.log(`Found ${stacksLength} stacks in config:`);
    for (const [name, stack] of Object.entries(config.stacks)) {
      logger.log(c.blue`  ${MARK_NODE} ${name} (${getClassName(stack)})`);
    }
    logger.log('\n-------------------------------------');
    logger.log('Generating stacks...');

    logger.debug('GenerateCommand.execute: Injecting Secrets to providers...');
    orchestrator.injectSecretsToProviders();
    logger.debug('GenerateCommand.execute: Secrets injected to providers successfully');

    let output = '';

    for (const [name, stack] of Object.entries(config.stacks)) {
      logger.log(c.blue`${MARK_NODE} Generating stack: ${name}...`);
      for (const resource of stack.build()) {
        output += yamlStringify(resource);
        output += '---\n';
      }
      logger.log(c.green`${MARK_CHECK} Successfully generated stack: ${name}`);
    }

    logger.log(c.green`${MARK_CHECK} All stacks generated successfully`);

    const outputPath = path.join(this.options.root ?? process.cwd(), this.options.outDir, 'stacks.yml');
    await fs.mkdir(this.options.outDir, { recursive: true });
    await fs.writeFile(outputPath, output);

    logger.log('');
    logger.log(`${MARK_CHECK} YAML file successfully written to:\n   ${path.resolve(outputPath)}\n`);
    logger.log(c.green`${MARK_CHECK} Done!`);
  }
}
