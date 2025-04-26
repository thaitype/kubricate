import fs from 'node:fs';
import path from 'node:path';
import type { BaseLogger, ProjectGenerateOptions } from '@kubricate/core';
import { MARK_BULLET, MARK_CHECK, MARK_NODE } from '../../internal/constant.js';
import type { GlobalConfigOptions } from '../../internal/types.js';

export interface GenerateCommandOptions extends GlobalConfigOptions {
  outDir: string;
}

export interface RenderedFile {
  filePath: string;
  content: string;
}

export class GenerateRunner {

  constructor(
    public readonly options: GenerateCommandOptions,
    public readonly generateObjects: Required<ProjectGenerateOptions>,
    private readonly renderedFiles: RenderedFile[],
    protected readonly logger: BaseLogger,
  ) { }

  async run() {
    if (this.generateObjects.cleanOutputDir) {
      this.cleanOutputDir(path.join(this.options.root ?? '', this.generateObjects.outputDir));
    }

    const stats = { written: 0 };

    this.logger.info(`Rendering with output mode "${this.generateObjects.outputMode}"\n`);
    for (const { filePath, content } of this.renderedFiles) {
      const outputPath = path.join(this.options.root ?? '', filePath);
      this.ensureDir(outputPath);
      fs.writeFileSync(outputPath, content);
      this.logger.log(`${MARK_BULLET} Written: ${outputPath}`);
      stats.written++;
    }

    this.logger.log(`\n${MARK_CHECK} Generated ${stats.written} file${stats.written > 1 ? 's' : ''} into "${this.generateObjects.outputDir}/"`);
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
}
