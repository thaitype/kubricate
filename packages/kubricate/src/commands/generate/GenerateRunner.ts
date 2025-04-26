import fs from 'node:fs';
import path from 'node:path';
import { merge } from 'lodash-es';
import type { BaseLogger, ProjectGenerateOptions } from '@kubricate/core';

const defaultOptions: Required<ProjectGenerateOptions> = {
  outputDir: 'output',
  outputMode: 'stack',
  cleanOutputDir: true,
};

export interface RenderedFile {
  filePath: string;
  content: string;
}

export class GenerateRunner {
  public readonly config: Required<ProjectGenerateOptions>;

  constructor(
    config: ProjectGenerateOptions | undefined,
    private readonly renderedFiles: RenderedFile[],
    protected readonly logger: BaseLogger,
  ) {
    this.config = merge({}, defaultOptions, config);
  }

  async run() {
    if (this.config.cleanOutputDir) {
      this.cleanOutputDir(this.config.outputDir);
    }

    const stats = {
      written: 0,
    };

    for (const { filePath, content } of this.renderedFiles) {
      this.ensureDir(filePath);
      fs.writeFileSync(filePath, content);
      stats.written++;
    }

    this.logger.log(`✅ Wrote ${stats.written} file(s) to "${this.config.outputDir}/"`);
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
