import path from 'node:path';

import type { BaseLogger } from '@kubricate/core';

import type { IFileSystem } from '../../domain/IFileSystem.js';
import { NodeFileSystem } from '../../domain/NodeFileSystem.js';
import { MARK_BULLET, MARK_CHECK } from '../../internal/constant.js';
import type { GenerateCommandOptions } from './GenerateCommand.js';
import type { ProjectGenerateOptions } from './types.js';

export interface RenderedFile {
  filePath: string;
  originalPath: string;
  content: string;
}

export class GenerateRunner {
  private readonly fileSystem: IFileSystem;

  constructor(
    public readonly options: GenerateCommandOptions,
    public readonly generateOptions: Required<ProjectGenerateOptions>,
    private readonly renderedFiles: RenderedFile[],
    protected readonly logger: BaseLogger,
    fileSystem?: IFileSystem
  ) {
    this.fileSystem = fileSystem ?? new NodeFileSystem();
  }

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
    if (this.fileSystem.exists(dir)) {
      this.fileSystem.remove(dir, { recursive: true, force: true });
    }
  }

  private ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    this.fileSystem.mkdir(dir, { recursive: true });
  }

  private processOutput(file: RenderedFile, stats: { written: number }) {
    if (this.options.stdout) {
      console.log(file.content);
      return;
    }

    const outputPath = path.join(this.options.root ?? '', file.filePath);
    this.ensureDir(outputPath);
    this.fileSystem.writeFile(outputPath, file.content);
    this.logger.log(`${MARK_BULLET} Written: ${outputPath}`);
    stats.written++;
  }
}
