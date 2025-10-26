import { describe, expect, it } from 'vitest';

import { InMemoryFileSystem } from './InMemoryFileSystem.js';

describe('InMemoryFileSystem', () => {
  describe('exists', () => {
    it('should return false for non-existent paths', () => {
      const fs = new InMemoryFileSystem();
      expect(fs.exists('/nonexistent')).toBe(false);
      expect(fs.exists('/path/to/file.txt')).toBe(false);
    });

    it('should return true for root directory', () => {
      const fs = new InMemoryFileSystem();
      expect(fs.exists('/')).toBe(true);
    });

    it('should return true for created directories', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      expect(fs.exists('/test')).toBe(true);
    });

    it('should return true for written files', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file.txt', 'content');
      expect(fs.exists('/test/file.txt')).toBe(true);
    });

    it('should handle paths with and without leading slash', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      expect(fs.exists('/test')).toBe(true);
      expect(fs.exists('test')).toBe(true);
    });
  });

  describe('mkdir', () => {
    it('should create a directory', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test');
      expect(fs.exists('/test')).toBe(true);
    });

    it('should create nested directories with recursive option', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/path/to/nested/dir', { recursive: true });
      expect(fs.exists('/path')).toBe(true);
      expect(fs.exists('/path/to')).toBe(true);
      expect(fs.exists('/path/to/nested')).toBe(true);
      expect(fs.exists('/path/to/nested/dir')).toBe(true);
    });

    it('should throw error when parent does not exist without recursive option', () => {
      const fs = new InMemoryFileSystem();
      expect(() => fs.mkdir('/path/to/dir')).toThrow('ENOENT');
    });

    it('should not throw if directory already exists', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      expect(() => fs.mkdir('/test', { recursive: true })).not.toThrow();
    });

    it('should throw error if a file exists with the same path', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file.txt', 'content');
      expect(() => fs.mkdir('/test/file.txt')).toThrow('EEXIST');
    });
  });

  describe('writeFile', () => {
    it('should write a file', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file.txt', 'Hello, World!');
      expect(fs.readFile('/test/file.txt')).toBe('Hello, World!');
    });

    it('should overwrite existing file', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file.txt', 'First');
      fs.writeFile('/test/file.txt', 'Second');
      expect(fs.readFile('/test/file.txt')).toBe('Second');
    });

    it('should throw error if parent directory does not exist', () => {
      const fs = new InMemoryFileSystem();
      expect(() => fs.writeFile('/nonexistent/file.txt', 'content')).toThrow('ENOENT');
    });

    it('should throw error if trying to write to a directory path', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      expect(() => fs.writeFile('/test', 'content')).toThrow('EISDIR');
    });

    it('should handle empty content', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/empty.txt', '');
      expect(fs.readFile('/test/empty.txt')).toBe('');
    });
  });

  describe('readFile', () => {
    it('should read file content', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file.txt', 'content');
      expect(fs.readFile('/test/file.txt')).toBe('content');
    });

    it('should throw error if file does not exist', () => {
      const fs = new InMemoryFileSystem();
      expect(() => fs.readFile('/nonexistent.txt')).toThrow('ENOENT');
    });

    it('should handle multi-line content', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      const content = 'line1\nline2\nline3';
      fs.writeFile('/test/file.txt', content);
      expect(fs.readFile('/test/file.txt')).toBe(content);
    });
  });

  describe('remove', () => {
    it('should remove a file', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file.txt', 'content');
      fs.remove('/test/file.txt');
      expect(fs.exists('/test/file.txt')).toBe(false);
    });

    it('should remove an empty directory', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.remove('/test');
      expect(fs.exists('/test')).toBe(false);
    });

    it('should throw error when removing non-empty directory without recursive', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file.txt', 'content');
      expect(() => fs.remove('/test')).toThrow('ENOTEMPTY');
    });

    it('should remove directory recursively with all contents', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test/nested/deep', { recursive: true });
      fs.writeFile('/test/file1.txt', 'content1');
      fs.writeFile('/test/nested/file2.txt', 'content2');
      fs.writeFile('/test/nested/deep/file3.txt', 'content3');

      fs.remove('/test', { recursive: true });

      expect(fs.exists('/test')).toBe(false);
      expect(fs.exists('/test/file1.txt')).toBe(false);
      expect(fs.exists('/test/nested')).toBe(false);
      expect(fs.exists('/test/nested/file2.txt')).toBe(false);
      expect(fs.exists('/test/nested/deep')).toBe(false);
      expect(fs.exists('/test/nested/deep/file3.txt')).toBe(false);
    });

    it('should throw error if path does not exist', () => {
      const fs = new InMemoryFileSystem();
      expect(() => fs.remove('/nonexistent')).toThrow('ENOENT');
    });

    it('should not throw error if path does not exist with force option', () => {
      const fs = new InMemoryFileSystem();
      expect(() => fs.remove('/nonexistent', { force: true })).not.toThrow();
    });

    it('should handle force and recursive together', () => {
      const fs = new InMemoryFileSystem();
      expect(() => fs.remove('/nonexistent', { recursive: true, force: true })).not.toThrow();
    });
  });

  describe('readdir', () => {
    it('should list files in a directory', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file1.txt', 'content1');
      fs.writeFile('/test/file2.txt', 'content2');

      const entries = fs.readdir('/test');
      expect(entries).toEqual(['file1.txt', 'file2.txt']);
    });

    it('should list subdirectories', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test/sub1', { recursive: true });
      fs.mkdir('/test/sub2', { recursive: true });

      const entries = fs.readdir('/test');
      expect(entries).toEqual(['sub1', 'sub2']);
    });

    it('should list both files and directories', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test/subdir', { recursive: true });
      fs.writeFile('/test/file.txt', 'content');

      const entries = fs.readdir('/test');
      expect(entries).toContain('file.txt');
      expect(entries).toContain('subdir');
      expect(entries).toHaveLength(2);
    });

    it('should return empty array for empty directory', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });

      const entries = fs.readdir('/test');
      expect(entries).toEqual([]);
    });

    it('should throw error if directory does not exist', () => {
      const fs = new InMemoryFileSystem();
      expect(() => fs.readdir('/nonexistent')).toThrow('ENOENT');
    });

    it('should only list immediate children, not nested files', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test/nested/deep', { recursive: true });
      fs.writeFile('/test/file1.txt', 'content');
      fs.writeFile('/test/nested/file2.txt', 'content');
      fs.writeFile('/test/nested/deep/file3.txt', 'content');

      const entries = fs.readdir('/test');
      expect(entries).toEqual(['file1.txt', 'nested']);
    });

    it('should return sorted entries', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/zebra.txt', 'content');
      fs.writeFile('/test/apple.txt', 'content');
      fs.writeFile('/test/banana.txt', 'content');

      const entries = fs.readdir('/test');
      expect(entries).toEqual(['apple.txt', 'banana.txt', 'zebra.txt']);
    });
  });

  describe('getWrittenFiles', () => {
    it('should return all written files', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file1.txt', 'content1');
      fs.writeFile('/test/file2.txt', 'content2');

      const files = fs.getWrittenFiles();
      expect(files).toEqual({
        '/test/file1.txt': 'content1',
        '/test/file2.txt': 'content2',
      });
    });

    it('should return empty object when no files written', () => {
      const fs = new InMemoryFileSystem();
      expect(fs.getWrittenFiles()).toEqual({});
    });
  });

  describe('getDirectories', () => {
    it('should return all directories including root', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test/nested', { recursive: true });

      const dirs = fs.getDirectories();
      expect(dirs).toContain('/');
      expect(dirs).toContain('/test');
      expect(dirs).toContain('/test/nested');
    });

    it('should return only root when no directories created', () => {
      const fs = new InMemoryFileSystem();
      expect(fs.getDirectories()).toEqual(['/']);
    });
  });

  describe('clear', () => {
    it('should clear all files and directories except root', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test', { recursive: true });
      fs.writeFile('/test/file.txt', 'content');

      fs.clear();

      expect(fs.getWrittenFiles()).toEqual({});
      expect(fs.getDirectories()).toEqual(['/']);
      expect(fs.exists('/')).toBe(true);
      expect(fs.exists('/test')).toBe(false);
    });
  });

  describe('path normalization', () => {
    it('should handle paths with backslashes', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('\\test', { recursive: true });
      expect(fs.exists('/test')).toBe(true);
    });

    it('should handle paths without leading slash', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('test', { recursive: true });
      expect(fs.exists('/test')).toBe(true);
      expect(fs.exists('test')).toBe(true);
    });

    it('should handle paths with trailing slash', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test/', { recursive: true });
      expect(fs.exists('/test')).toBe(true);
    });

    it('should normalize paths consistently across operations', () => {
      const fs = new InMemoryFileSystem();
      fs.mkdir('/test/', { recursive: true });
      fs.writeFile('test/file.txt', 'content');
      expect(fs.readFile('/test/file.txt')).toBe('content');
    });
  });

  describe('integration scenarios', () => {
    it('should support complete file system workflow', () => {
      const fs = new InMemoryFileSystem();

      // Create directory structure
      fs.mkdir('/output/app', { recursive: true });
      fs.mkdir('/output/db', { recursive: true });

      // Write files
      fs.writeFile('/output/app/deployment.yml', 'kind: Deployment');
      fs.writeFile('/output/app/service.yml', 'kind: Service');
      fs.writeFile('/output/db/statefulset.yml', 'kind: StatefulSet');

      // Verify structure
      expect(fs.readdir('/output')).toEqual(['app', 'db']);
      expect(fs.readdir('/output/app')).toEqual(['deployment.yml', 'service.yml']);
      expect(fs.readdir('/output/db')).toEqual(['statefulset.yml']);

      // Read files
      expect(fs.readFile('/output/app/deployment.yml')).toBe('kind: Deployment');

      // Clean up
      fs.remove('/output', { recursive: true });
      expect(fs.exists('/output')).toBe(false);
    });

    it('should support GenerateRunner use case', () => {
      const fs = new InMemoryFileSystem();

      // Clean output directory (simulate cleanOutputDir)
      if (fs.exists('/output')) {
        fs.remove('/output', { recursive: true, force: true });
      }

      // Create directory structure (simulate ensureDir)
      fs.mkdir('/output/app', { recursive: true });

      // Write files (simulate writeFile)
      fs.writeFile('/output/app/Deployment_deployment.yml', 'apiVersion: apps/v1\nkind: Deployment');

      // Verify
      const files = fs.getWrittenFiles();
      expect(files['/output/app/Deployment_deployment.yml']).toContain('kind: Deployment');
    });
  });
});
