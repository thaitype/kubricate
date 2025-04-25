
import fs from 'fs/promises';
import path from "node:path";

import type { BaseLogger } from "@kubricate/core";

import { MARK_CHECK } from "../../internal/constant.js";
import { renderStacks, resolveOutputPath } from "./renderers.js";
import { BaseCommand } from "../base.js";
import type { GlobalConfigOptions } from '../../internal/types.js';

export interface GenerateCommandOptions extends GlobalConfigOptions {
  outDir: string;
}

export class GenerateCommand extends BaseCommand  {
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

    for (const r of rendered) {
      const outPath = resolveOutputPath(r, outputMode);
      if (!files[outPath]) files[outPath] = [];
      files[outPath].push(r.content);
    }

    for (const [relativePath, contents] of Object.entries(files)) {
      const absPath = path.join(this.options.root ?? process.cwd(), this.options.outDir, relativePath);
      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, contents.join('\n'));
      this.logger.log(`${MARK_CHECK} Wrote: ${relativePath}`);
    }
  }
}