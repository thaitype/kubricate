import path from 'node:path';

import c from 'ansis';
import { merge } from 'lodash-es';

import type { BaseLogger } from '@kubricate/core';

import { ResourceFilter } from '../../domain/ResourceFilter.js';
import { MARK_CHECK, MARK_NODE, MARK_TREE_END, MARK_TREE_LEAF } from '../../internal/constant.js';
import type { GlobalConfigOptions } from '../../internal/types.js';
import { extractStackInfoFromConfig, type StackInfo } from '../../internal/utils.js';
import type { KubricateConfig } from '../../types.js';
import { GenerateRunner, type RenderedFile } from './GenerateRunner.js';
import { Renderer } from './Renderer.js';
import type { ProjectGenerateOptions } from './types.js';

export interface GenerateCommandOptions extends GlobalConfigOptions {
  outDir: string;
  /**
   * Output into stdout
   *
   * When set, the generated files will be printed to stdout instead of being written to disk.
   */
  stdout: boolean;

  /**
   * Filter stacks or resources by ID (e.g., myStack or myStack.resource)
   *
   * Empty if not specified, all stacks will be included.
   */
  filter?: string[];
}

export class GenerateCommand {
  constructor(
    protected options: GenerateCommandOptions,
    protected logger: BaseLogger
  ) {}

  resolveDefaultGenerateOptions(config: KubricateConfig) {
    const defaultOptions: Required<ProjectGenerateOptions> = {
      outputDir: 'output',
      outputMode: 'stack',
      cleanOutputDir: true,
    };
    const result = merge({}, defaultOptions, config.generate);
    return result;
  }

  async execute(config: KubricateConfig) {
    const logger = this.logger;
    const generateOptions = this.resolveDefaultGenerateOptions(config);

    logger.info('Generating stacks for Kubernetes...');

    const renderedFiles = this.getRenderedFiles(config, generateOptions.outputMode);
    const runner = new GenerateRunner(this.options, generateOptions, renderedFiles, this.logger);

    this.showStacks(config);
    this.logger.log('');
    await runner.run();
    logger.log(c.green`${MARK_CHECK} Done!`);
  }

  getRenderedFiles(config: KubricateConfig, outputMode: ProjectGenerateOptions['outputMode']) {
    const renderer = new Renderer(config, this.logger);
    const rendered = renderer.renderStacks(config);

    const files: Record<string, string[]> = {};
    const renderedFiles: RenderedFile[] = [];

    for (const r of rendered) {
      const outPath = renderer.resolveOutputPath(r, outputMode, this.options.stdout);
      if (!files[outPath]) files[outPath] = [];
      files[outPath].push(r.content);
    }

    for (const [filePath, contents] of Object.entries(files)) {
      const relatePath = path.join(this.options.outDir, filePath);
      renderedFiles.push({ filePath: relatePath, originalPath: filePath, content: contents.join('\n') });
    }

    if (this.options.filter) {
      return this.filterResources(renderedFiles, this.options.filter);
    }
    return renderedFiles;
  }

  filterResources(renderedFiles: RenderedFile[], filters: string[]): RenderedFile[] {
    const resourceFilter = new ResourceFilter();
    return resourceFilter.filter(renderedFiles, filters);
  }

  showStacks(config: KubricateConfig) {
    const logger = this.logger;
    const stacksLength = Object.keys(config.stacks ?? {}).length;

    if (!config.stacks || stacksLength === 0) {
      throw new Error('No stacks found in config');
    }

    logger.info(`Found ${stacksLength} stacks in config:`);

    const renderListTree = (kinds: StackInfo['kinds']) => {
      const lastIndex = kinds.length - 1;
      for (let i = 0; i < kinds.length; i++) {
        const kind = kinds[i];
        const marker = i === lastIndex ? MARK_TREE_END : MARK_TREE_LEAF;
        logger.log(c.blue`      ${marker} ${kind.kind}` + c.dim` (id: ${kind.id})`);
      }
    };

    for (const stack of extractStackInfoFromConfig(config)) {
      logger.log(c.blue`  ${MARK_NODE} ${stack.name}` + c.dim` (type: ${stack.type})`);
      renderListTree(stack.kinds);
      logger.log('');
    }
  }
}
