
import fs from 'fs/promises';
import path from "node:path";

import type { BaseLogger } from "@kubricate/core";

import { MARK_CHECK } from "../../internal/constant.js";
import { renderStacks, resolveOutputPath } from "./renderers.js";
import { BaseCommand } from "../base.js";
import type { GlobalConfigOptions } from '../../internal/types.js';
import { GenerateRunner, type RenderedFile } from './GenerateRunner.js';

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
    const { config } = await this.init();
    const rendered = renderStacks(config);

    const outputMode = config.generate?.outputMode ?? 'stack';

    const files: Record<string, string[]> = {};
    const renderedFiles: RenderedFile[] = [];

    for (const r of rendered) {
      const outPath = resolveOutputPath(r, outputMode);
      if (!files[outPath]) files[outPath] = [];
      files[outPath].push(r.content);
    }

    for (const [filePath, contents] of Object.entries(files)) {
      const relatePath = path.join(this.options.outDir, filePath);
      renderedFiles.push({ filePath: relatePath, content: contents.join('\n') });
      // this.logger.log(`${MARK_CHECK} Processing: ${filePath} from ${relatePath}`);
    }
    const runner = new GenerateRunner(config.generate, renderedFiles, this.logger);
    await runner.run();
  }
}