import path from "node:path";

import type { BaseLogger, KubricateConfig, ProjectGenerateOptions } from "@kubricate/core";

import { Renderer } from "./Renderers.js";
import { BaseCommand } from "../base.js";
import type { GlobalConfigOptions } from '../../internal/types.js';
import { GenerateRunner, type RenderedFile } from './GenerateRunner.js';
import c from 'ansis';
import { MARK_CHECK, MARK_NODE, MARK_TREE_END, MARK_TREE_LEAF } from "../../internal/constant.js";
import { extractStackInfoFromConfig, type StackInfo } from "../../internal/utils.js";
import { merge } from "lodash-es";

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

  resolveDefaultGenerateOptions(config: KubricateConfig) {
    const defaultOptions: Required<ProjectGenerateOptions> = {
      outputDir: 'output',
      outputMode: 'stack',
      cleanOutputDir: true,
    };
    return merge({}, defaultOptions, config.generate);
  }

  async execute() {
    const logger = this.logger;
    const { config } = await this.init();
    const generateOptions = this.resolveDefaultGenerateOptions(config);

    logger.info('Generating stacks for Kubernetes...');
    const renderedFiles = this.getRenderedFiles(config, generateOptions.outputMode);
    const runner = new GenerateRunner(this.options, generateOptions, renderedFiles, this.logger);
    logger.log('-------------------------------------');
    this.showStacks(config);
    logger.log('-------------------------------------');
    await runner.run();
    logger.log('-------------------------------------\n');
    logger.log(c.green`${MARK_CHECK} Done!`);
  }

  getRenderedFiles(config: KubricateConfig, outputMode: ProjectGenerateOptions['outputMode']) {
    const renderer = new Renderer(config, this.logger);
    const rendered = renderer.renderStacks(config);

    const files: Record<string, string[]> = {};
    const renderedFiles: RenderedFile[] = [];

    for (const r of rendered) {
      const outPath = renderer.resolveOutputPath(r, outputMode);
      if (!files[outPath]) files[outPath] = [];
      files[outPath].push(r.content);
    }

    for (const [filePath, contents] of Object.entries(files)) {
      const relatePath = path.join(this.options.outDir, filePath);
      renderedFiles.push({ filePath: relatePath, content: contents.join('\n') });
    }
    return renderedFiles;
  }

  showStacks(config: KubricateConfig) {
    const logger = this.logger;
    const stacksLength = Object.keys(config.stacks ?? {}).length;

    if (!config.stacks || stacksLength === 0) {
      throw new Error('No stacks found in config');
    }

    logger.log(`Found ${stacksLength} stacks in config:`);

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