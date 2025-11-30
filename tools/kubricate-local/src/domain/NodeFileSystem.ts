import fs from 'node:fs';

import type { IFileSystem } from './IFileSystem.js';

/**
 * NodeFileSystem is the production adapter for IFileSystem that uses the real Node.js fs module.
 *
 * This is a thin wrapper around Node.js fs operations, providing a consistent interface
 * that matches IFileSystem. It performs real file system operations and should be used
 * in production code.
 *
 * @example
 * ```typescript
 * const fileSystem = new NodeFileSystem();
 * const runner = new GenerateRunner(options, generateOptions, files, logger, fileSystem);
 * await runner.run();
 * ```
 */
export class NodeFileSystem implements IFileSystem {
  /**
   * Check if a file or directory exists using fs.existsSync()
   */
  exists(path: string): boolean {
    return fs.existsSync(path);
  }

  /**
   * Remove a file or directory using fs.rmSync()
   */
  remove(path: string, options?: { recursive?: boolean; force?: boolean }): void {
    fs.rmSync(path, options);
  }

  /**
   * Create a directory using fs.mkdirSync()
   */
  mkdir(path: string, options?: { recursive?: boolean }): void {
    fs.mkdirSync(path, options);
  }

  /**
   * Write content to a file using fs.writeFileSync()
   */
  writeFile(path: string, content: string): void {
    fs.writeFileSync(path, content, 'utf-8');
  }

  /**
   * Read content from a file using fs.readFileSync()
   */
  readFile(path: string): string {
    return fs.readFileSync(path, 'utf-8');
  }

  /**
   * List files in a directory using fs.readdirSync()
   */
  readdir(path: string): string[] {
    return fs.readdirSync(path);
  }
}
