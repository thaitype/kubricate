import c from 'ansis';
import { MARK_CHECK, MARK_NODE } from '../internal/constant.js';
import { extractStackInfo } from '../internal/utils.js';
import { stringify as yamlStringify } from 'yaml';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { GlobalConfigOptions } from '../internal/types.js';
import type { BaseLogger, KubricateConfig } from '@kubricate/core';
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

  generateStacks(config: KubricateConfig) {
    let output = '';
    const logger = this.logger;
    if (!config.stacks || Object.keys(config.stacks ?? {}).length === 0) {
      throw new Error('No stacks found in config');
    }
    for (const [name, stack] of Object.entries(config.stacks)) {
      logger.log(c.blue`${MARK_NODE} Generating stack: ${name}...`);
      for (const resource of stack.build()) {
        output += yamlStringify(resource);
        output += '---\n';
      }
      logger.log(`${MARK_CHECK} Successfully generated stack: ${name}`);
    }

    return output;
  }

  async execute() {
    const logger = this.logger;
    logger.info('Generating stacks for Kubernetes...');
    logger.log('-------------------------------------\n');
    const { config, orchestrator } = await this.init();

    const stacksLength = Object.keys(config.stacks ?? {}).length;

    if (!config.stacks || stacksLength === 0) {
      logger.error(`No stacks found in config`);
      process.exit(1);
    }

    logger.log(`Found ${stacksLength} stacks in config:`);

    for (const stack of extractStackInfo(config)) {
      logger.log(c.blue`  ${MARK_NODE} ${stack.name} (${stack.type})`);
    }

    logger.log('');
    logger.log('-------------------------------------');
    logger.log('Generating stacks...');

    logger.debug('GenerateCommand.execute: Injecting Secrets to providers...');
    orchestrator.injectSecretsToProviders();
    logger.debug('GenerateCommand.execute: Secrets injected to providers successfully');

    const output = this.generateStacks(config);

    logger.log(c.green`${MARK_CHECK} All stacks generated successfully`);

    const outputPath = path.join(this.options.root ?? process.cwd(), this.options.outDir, 'stacks.yml');
    await fs.mkdir(this.options.outDir, { recursive: true });
    await fs.writeFile(outputPath, output);

    logger.log('');
    logger.log(`${MARK_CHECK} YAML file successfully written to:\n   ${path.resolve(outputPath)}\n`);

    logger.log(c.green`${MARK_CHECK} Done!`);
  }
}
