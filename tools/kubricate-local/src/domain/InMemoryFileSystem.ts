import path from 'node:path';

import type { IFileSystem } from './IFileSystem.js';

/**
 * InMemoryFileSystem is a testing adapter for IFileSystem that simulates file operations in memory.
 *
 * This implementation stores files and directories in memory using Maps and Sets,
 * allowing tests to run without touching the real file system. It's fast, deterministic,
 * and perfect for unit testing.
 *
 * Features:
 * - No disk I/O (all operations are in-memory)
 * - Path normalization to handle different path formats
 * - Recursive directory operations
 * - Ability to inspect written files for assertions
 *
 * @example
 * ```typescript
 * const fs = new InMemoryFileSystem();
 * const runner = new GenerateRunner(options, generateOptions, files, logger, fs);
 * await runner.run();
 *
 * // Assert files were written
 * expect(fs.getWrittenFiles()).toEqual({
 *   '/output/app.yml': 'apiVersion: v1\nkind: Service...',
 * });
 * ```
 */
export class InMemoryFileSystem implements IFileSystem {
  private files = new Map<string, string>();
  private directories = new Set<string>();

  constructor() {
    // Root directory always exists
    this.directories.add('/');
  }

  /**
   * Normalize a path to ensure consistency:
   * - Convert backslashes to forward slashes
   * - Remove trailing slashes (except for root)
   * - Resolve relative paths
   */
  private normalizePath(p: string): string {
    // Convert backslashes to forward slashes
    let normalized = p.replace(/\\/g, '/');

    // Remove trailing slash unless it's root
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    // Ensure it starts with /
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    return normalized;
  }

  /**
   * Get the parent directory path
   */
  private getParentDir(filePath: string): string {
    const normalized = this.normalizePath(filePath);
    const parent = path.dirname(normalized);
    return this.normalizePath(parent);
  }

  /**
   * Get all parent directories for a path (excluding root)
   */
  private getAllParentDirs(p: string): string[] {
    const normalized = this.normalizePath(p);
    const parts = normalized.split('/').filter(Boolean);
    const parents: string[] = [];

    for (let i = 1; i <= parts.length; i++) {
      parents.push('/' + parts.slice(0, i).join('/'));
    }

    return parents;
  }

  exists(p: string): boolean {
    const normalized = this.normalizePath(p);
    return this.files.has(normalized) || this.directories.has(normalized);
  }

  remove(p: string, options?: { recursive?: boolean; force?: boolean }): void {
    const normalized = this.normalizePath(p);

    // If force is true and path doesn't exist, silently succeed
    if (options?.force && !this.exists(normalized)) {
      return;
    }

    // Check if it exists
    if (!this.exists(normalized)) {
      throw new Error(`ENOENT: no such file or directory, rm '${p}'`);
    }

    // If it's a file, remove it
    if (this.files.has(normalized)) {
      this.files.delete(normalized);
      return;
    }

    // If it's a directory
    if (this.directories.has(normalized)) {
      // Prevent removal of root directory
      if (normalized === '/') {
        throw new Error(`EPERM: operation not permitted, rmdir '${p}'`);
      }

      // Calculate prefix for child detection (handle root correctly)
      const prefix = normalized === '/' ? '/' : normalized + '/';

      // Check if recursive is required
      const hasChildren =
        Array.from(this.files.keys()).some(f => f.startsWith(prefix)) ||
        Array.from(this.directories).some(d => d.startsWith(prefix) && d !== normalized);

      if (hasChildren && !options?.recursive) {
        throw new Error(`ENOTEMPTY: directory not empty, rmdir '${p}'`);
      }

      // Remove directory and all children if recursive
      if (options?.recursive) {
        // Remove all files under this directory
        for (const filePath of Array.from(this.files.keys())) {
          if (filePath.startsWith(prefix)) {
            this.files.delete(filePath);
          }
        }

        // Remove all subdirectories
        for (const dirPath of Array.from(this.directories)) {
          if (dirPath.startsWith(prefix)) {
            this.directories.delete(dirPath);
          }
        }
      }

      // Remove the directory itself
      this.directories.delete(normalized);
    }
  }

  mkdir(p: string, options?: { recursive?: boolean }): void {
    const normalized = this.normalizePath(p);

    // If directory already exists, we're done
    if (this.directories.has(normalized)) {
      return;
    }

    // If a file exists with this path, throw error
    if (this.files.has(normalized)) {
      throw new Error(`EEXIST: file already exists, mkdir '${p}'`);
    }

    // Check if parent exists
    const parent = this.getParentDir(normalized);
    const parentExists = this.directories.has(parent);

    if (!parentExists && !options?.recursive) {
      throw new Error(`ENOENT: no such file or directory, mkdir '${p}'`);
    }

    // Create parent directories if recursive
    if (options?.recursive) {
      const parents = this.getAllParentDirs(normalized);

      // First, verify no ancestor is a file
      for (const parentDir of parents) {
        if (this.files.has(parentDir)) {
          throw new Error(`ENOTDIR: not a directory, mkdir '${p}'`);
        }
      }

      // After verification, create missing parent directories
      for (const parentDir of parents) {
        if (!this.directories.has(parentDir)) {
          this.directories.add(parentDir);
        }
      }
    } else {
      // Just create this directory
      this.directories.add(normalized);
    }
  }

  writeFile(p: string, content: string): void {
    const normalized = this.normalizePath(p);

    // Check if parent directory exists
    const parent = this.getParentDir(normalized);
    if (this.files.has(parent)) {
      throw new Error(`ENOTDIR: not a directory, open '${p}'`);
    }
    if (!this.directories.has(parent)) {
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }

    // If a directory exists with this path, throw error
    if (this.directories.has(normalized)) {
      throw new Error(`EISDIR: illegal operation on a directory, open '${p}'`);
    }

    // Write the file
    this.files.set(normalized, content);
  }

  readFile(p: string): string {
    const normalized = this.normalizePath(p);

    if (!this.files.has(normalized)) {
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }

    return this.files.get(normalized)!;
  }

  readdir(p: string): string[] {
    const normalized = this.normalizePath(p);

    if (!this.directories.has(normalized)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${p}'`);
    }

    const entries: string[] = [];
    const prefix = normalized === '/' ? '/' : normalized + '/';

    // Find all immediate children (files and directories)
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relative = filePath.substring(prefix.length);
        const firstSegment = relative.split('/')[0];
        if (firstSegment && !entries.includes(firstSegment)) {
          entries.push(firstSegment);
        }
      }
    }

    for (const dirPath of this.directories) {
      if (dirPath.startsWith(prefix) && dirPath !== normalized) {
        const relative = dirPath.substring(prefix.length);
        const firstSegment = relative.split('/')[0];
        if (firstSegment && !entries.includes(firstSegment)) {
          entries.push(firstSegment);
        }
      }
    }

    return entries.sort();
  }

  /**
   * Get all written files as a record (for testing assertions).
   *
   * @returns Record of file paths to their content
   *
   * @example
   * ```typescript
   * const files = fs.getWrittenFiles();
   * expect(files['/output/app.yml']).toContain('kind: Service');
   * ```
   */
  getWrittenFiles(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [path, content] of this.files.entries()) {
      result[path] = content;
    }
    return result;
  }

  /**
   * Get all created directories as an array (for testing assertions).
   *
   * @returns Array of directory paths
   *
   * @example
   * ```typescript
   * const dirs = fs.getDirectories();
   * expect(dirs).toContain('/output/app');
   * ```
   */
  getDirectories(): string[] {
    return Array.from(this.directories).sort();
  }

  /**
   * Clear all files and directories (for test cleanup).
   *
   * @example
   * ```typescript
   * afterEach(() => {
   *   fs.clear();
   * });
   * ```
   */
  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.directories.add('/');
  }
}
