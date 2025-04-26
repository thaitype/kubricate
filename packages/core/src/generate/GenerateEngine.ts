import type { ProjectGenerateOptions } from './types.js';
import { HashEngine } from './HashEngine.js';

export interface PlannedWrite {
  filePath: string;
  content: string;
  shouldWrite: boolean;
}

export class GenerateEngine {
  private readonly hashEngine: HashEngine;

  constructor(
    public readonly config: Required<ProjectGenerateOptions>,
    hashEngine: HashEngine
  ) {
    this.hashEngine = hashEngine;

    // Auto-disable skipIfUnchanged if cleaning
    if (this.config.cleanOutputDir) {
      this.config.skipIfUnchanged = false;
    }
  }

  /**
   * Plan whether a file should be written based on hash logic and config.
   */
  planWrite(filePath: string, content: string): PlannedWrite {
    const shouldWrite = !this.config.skipIfUnchanged || this.hashEngine.hasChanged(filePath, content);

    if (shouldWrite) {
      this.hashEngine.markWritten(filePath, content);
    }

    return { filePath, content, shouldWrite };
  }

  /**
   * Return all previously tracked but now-unused files.
   * Use this to clean up stale files if cleanOutputDir is enabled.
   */
  getStaleFiles(): string[] {
    return this.hashEngine.getStaleFiles();
  }

  /**
   * Return the final hash state to persist externally.
   */
  getUpdatedHashes(): Record<string, string> {
    return this.hashEngine.getUpdatedHashes();
  }
}
