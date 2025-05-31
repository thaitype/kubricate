import fs from 'node:fs';
import path from 'node:path';

import type { BaseLogger } from '@kubricate/core';

import type { GenerateCommandOptions } from './GenerateCommand.js';
import type { ProjectGenerateOptions } from './types.js';

import { MARK_BULLET, MARK_CHECK } from '../../internal/constant.js';

export interface RenderedFile {
  filePath: string;
  originalPath: string;
  content: string;
}

export class GenerateRunner {
  constructor(
    public readonly options: GenerateCommandOptions,
    public readonly generateOptions: Required<ProjectGenerateOptions>,
    private readonly renderedFiles: RenderedFile[],
    protected readonly logger: BaseLogger
  ) {}

  async run() {
    if (this.generateOptions.cleanOutputDir) {
      this.cleanOutputDir(path.join(this.options.root ?? '', this.generateOptions.outputDir));
    }

    const stats = { written: 0 };

    this.logger.info(`Rendering with output mode "${this.generateOptions.outputMode}"`);
    if (this.generateOptions.cleanOutputDir) {
      this.logger.info(`Cleaning output directory: ${this.options.outDir}`);
    }
    this.logger.log(`\nGenerating stacks...`);
    for (const file of this.renderedFiles) {
      this.processOutput(file, stats);
    }

    if (stats.written === 0) {
      this.logger.warn(`No files generated.`);
      return;
    }
    this.logger.log(
      `\n${MARK_CHECK} Generated ${stats.written} file${stats.written > 1 ? 's' : ''} into "${this.generateOptions.outputDir}/"`
    );
  }

  private cleanOutputDir(dir: string) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  private ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
  }

  private processOutput(file: RenderedFile, stats: { written: number }) {
    if (this.options.stdout) {
      console.log(file.content);
      return;
    }

    const outputPath = path.join(this.options.root ?? '', file.filePath);
    this.ensureDir(outputPath);
    fs.writeFileSync(outputPath, file.content);
    this.logger.log(`${MARK_BULLET} Written: ${outputPath}`);
    stats.written++;
  }
}
