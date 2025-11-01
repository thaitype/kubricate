/**
 * File system abstraction for dependency injection.
 *
 * This interface defines the file system operations needed by the application,
 * enabling easy testing with in-memory implementations and making the code
 * independent of Node.js fs module.
 *
 * This follows the Ports and Adapters (Hexagonal Architecture) pattern,
 * where IFileSystem is a "port" that can have multiple "adapters":
 * - NodeFileSystem: Adapter for real file system operations
 * - InMemoryFileSystem: Adapter for testing without disk I/O
 */
export interface IFileSystem {
  /**
   * Check if a file or directory exists at the given path.
   *
   * @param path - The file or directory path to check
   * @returns true if the path exists, false otherwise
   *
   * @example
   * ```typescript
   * if (fs.exists('/path/to/dir')) {
   *   // Directory exists
   * }
   * ```
   */
  exists(path: string): boolean;

  /**
   * Remove a file or directory at the given path.
   *
   * @param path - The file or directory path to remove
   * @param options - Options for removal
   * @param options.recursive - Remove directories and their contents recursively
   * @param options.force - Ignore errors if path doesn't exist
   *
   * @example
   * ```typescript
   * // Remove directory and all its contents
   * fs.remove('/path/to/dir', { recursive: true, force: true });
   * ```
   */
  remove(path: string, options?: { recursive?: boolean; force?: boolean }): void;

  /**
   * Create a directory at the given path.
   *
   * @param path - The directory path to create
   * @param options - Options for directory creation
   * @param options.recursive - Create parent directories as needed
   *
   * @example
   * ```typescript
   * // Create directory and all parent directories
   * fs.mkdir('/path/to/nested/dir', { recursive: true });
   * ```
   */
  mkdir(path: string, options?: { recursive?: boolean }): void;

  /**
   * Write content to a file at the given path.
   *
   * If the file already exists, it will be overwritten.
   * Parent directories must exist (use mkdir first if needed).
   *
   * @param path - The file path to write to
   * @param content - The content to write
   *
   * @example
   * ```typescript
   * fs.writeFile('/path/to/file.txt', 'Hello, World!');
   * ```
   */
  writeFile(path: string, content: string): void;

  /**
   * Read content from a file at the given path.
   *
   * @param path - The file path to read from
   * @returns The file content as a string
   *
   * @example
   * ```typescript
   * const content = fs.readFile('/path/to/file.txt');
   * ```
   */
  readFile(path: string): string;

  /**
   * List all files in a directory (non-recursive).
   *
   * @param path - The directory path to list
   * @returns Array of file names in the directory
   *
   * @example
   * ```typescript
   * const files = fs.readdir('/path/to/dir');
   * // Returns: ['file1.txt', 'file2.txt', 'subdir']
   * ```
   */
  readdir(path: string): string[];
}
