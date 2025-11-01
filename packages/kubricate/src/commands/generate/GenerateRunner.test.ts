import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BaseLogger } from '@kubricate/core';

import { InMemoryFileSystem } from '../../domain/InMemoryFileSystem.js';
import type { GenerateCommandOptions } from './GenerateCommand.js';
import { GenerateRunner, type RenderedFile } from './GenerateRunner.js';
import type { ProjectGenerateOptions } from './types.js';

describe('GenerateRunner', () => {
  let mockLogger: BaseLogger;
  let fileSystem: InMemoryFileSystem;

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      level: 'info',
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
    };

    // Create fresh file system for each test
    fileSystem = new InMemoryFileSystem();
  });

  const createOptions = (overrides?: Partial<GenerateCommandOptions>): GenerateCommandOptions => ({
    root: '',
    outDir: 'output',
    stdout: false,
    ...overrides,
  });

  const createGenerateOptions = (overrides?: Partial<ProjectGenerateOptions>): Required<ProjectGenerateOptions> => ({
    outputDir: 'output',
    outputMode: 'stack',
    cleanOutputDir: true,
    ...overrides,
  });

  const createFile = (filePath: string, originalPath: string, content: string): RenderedFile => ({
    filePath,
    originalPath,
    content,
  });

  describe('run', () => {
    it('should write files to the file system', async () => {
      const files = [
        createFile('output/app.yml', 'app.deployment', 'kind: Deployment\n---\n'),
        createFile('output/db.yml', 'db.statefulset', 'kind: StatefulSet\n---\n'),
      ];

      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), files, mockLogger, fileSystem);

      await runner.run();

      const writtenFiles = fileSystem.getWrittenFiles();
      expect(writtenFiles['/output/app.yml']).toBe('kind: Deployment\n---\n');
      expect(writtenFiles['/output/db.yml']).toBe('kind: StatefulSet\n---\n');
    });

    it('should create necessary directories', async () => {
      const files = [createFile('output/nested/dir/file.yml', 'app.deployment', 'content')];

      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), files, mockLogger, fileSystem);

      await runner.run();

      expect(fileSystem.exists('/output/nested/dir')).toBe(true);
      expect(fileSystem.getWrittenFiles()['/output/nested/dir/file.yml']).toBe('content');
    });

    it('should clean output directory when cleanOutputDir is true', async () => {
      // Pre-populate file system with existing files
      fileSystem.mkdir('/output', { recursive: true });
      fileSystem.writeFile('/output/old-file.yml', 'old content');

      const files = [createFile('output/new-file.yml', 'app.deployment', 'new content')];

      const runner = new GenerateRunner(
        createOptions(),
        createGenerateOptions({ cleanOutputDir: true }),
        files,
        mockLogger,
        fileSystem
      );

      await runner.run();

      // Old file should be removed
      expect(fileSystem.exists('/output/old-file.yml')).toBe(false);
      // New file should exist
      expect(fileSystem.getWrittenFiles()['/output/new-file.yml']).toBe('new content');
    });

    it('should not clean output directory when cleanOutputDir is false', async () => {
      // Pre-populate file system
      fileSystem.mkdir('/output', { recursive: true });
      fileSystem.writeFile('/output/old-file.yml', 'old content');

      const files = [createFile('output/new-file.yml', 'app.deployment', 'new content')];

      const runner = new GenerateRunner(
        createOptions(),
        createGenerateOptions({ cleanOutputDir: false }),
        files,
        mockLogger,
        fileSystem
      );

      await runner.run();

      // Both old and new files should exist
      expect(fileSystem.getWrittenFiles()['/output/old-file.yml']).toBe('old content');
      expect(fileSystem.getWrittenFiles()['/output/new-file.yml']).toBe('new content');
    });

    it('should handle empty file list', async () => {
      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), [], mockLogger, fileSystem);

      await runner.run();

      expect(mockLogger.warn).toHaveBeenCalledWith('No files generated.');
      expect(Object.keys(fileSystem.getWrittenFiles())).toHaveLength(0);
    });

    it('should log correct messages during generation', async () => {
      const files = [
        createFile('output/app.yml', 'app.deployment', 'content1'),
        createFile('output/db.yml', 'db.statefulset', 'content2'),
      ];

      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), files, mockLogger, fileSystem);

      await runner.run();

      expect(mockLogger.info).toHaveBeenCalledWith('Rendering with output mode "stack"');
      expect(mockLogger.info).toHaveBeenCalledWith('Cleaning output directory: output');
      expect(mockLogger.log).toHaveBeenCalledWith('\nGenerating stacks...');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Written: output/app.yml'));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Written: output/db.yml'));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Generated 2 files'));
    });

    it('should respect root directory option', async () => {
      const files = [createFile('output/app.yml', 'app.deployment', 'content')];

      const runner = new GenerateRunner(
        createOptions({ root: '/custom/root' }),
        createGenerateOptions(),
        files,
        mockLogger,
        fileSystem
      );

      await runner.run();

      expect(fileSystem.getWrittenFiles()['/custom/root/output/app.yml']).toBe('content');
    });

    it('should handle different output modes', async () => {
      const files = [
        createFile('output/stacks.yml', 'app.deployment', 'content1'),
        createFile('output/stacks.yml', 'db.statefulset', 'content2'),
      ];

      const runner = new GenerateRunner(
        createOptions(),
        createGenerateOptions({ outputMode: 'flat' }),
        files,
        mockLogger,
        fileSystem
      );

      await runner.run();

      expect(mockLogger.info).toHaveBeenCalledWith('Rendering with output mode "flat"');
    });

    it('should not write files when stdout is true', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const files = [createFile('output/app.yml', 'app.deployment', 'content')];

      const runner = new GenerateRunner(
        createOptions({ stdout: true }),
        createGenerateOptions(),
        files,
        mockLogger,
        fileSystem
      );

      await runner.run();

      // No files should be written
      expect(Object.keys(fileSystem.getWrittenFiles())).toHaveLength(0);
      // Content should be logged to console
      expect(consoleSpy).toHaveBeenCalledWith('content');

      consoleSpy.mockRestore();
    });
  });

  describe('cleanOutputDir', () => {
    it('should not throw when output directory does not exist', async () => {
      const files = [createFile('output/app.yml', 'app.deployment', 'content')];

      const runner = new GenerateRunner(
        createOptions(),
        createGenerateOptions({ cleanOutputDir: true }),
        files,
        mockLogger,
        fileSystem
      );

      // Should not throw
      await expect(runner.run()).resolves.not.toThrow();
    });

    it('should remove all nested files and directories', async () => {
      // Create complex directory structure
      fileSystem.mkdir('/output/app/nested', { recursive: true });
      fileSystem.mkdir('/output/db', { recursive: true });
      fileSystem.writeFile('/output/app/file1.yml', 'content1');
      fileSystem.writeFile('/output/app/nested/file2.yml', 'content2');
      fileSystem.writeFile('/output/db/file3.yml', 'content3');

      const files = [createFile('output/new.yml', 'app.deployment', 'new content')];

      const runner = new GenerateRunner(
        createOptions(),
        createGenerateOptions({ cleanOutputDir: true }),
        files,
        mockLogger,
        fileSystem
      );

      await runner.run();

      // All old files should be removed
      expect(fileSystem.exists('/output/app/file1.yml')).toBe(false);
      expect(fileSystem.exists('/output/app/nested/file2.yml')).toBe(false);
      expect(fileSystem.exists('/output/db/file3.yml')).toBe(false);
      // Only new file should exist
      expect(fileSystem.getWrittenFiles()['/output/new.yml']).toBe('new content');
    });
  });

  describe('ensureDir', () => {
    it('should create parent directories recursively', async () => {
      const files = [createFile('output/a/b/c/file.yml', 'app.deployment', 'content')];

      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), files, mockLogger, fileSystem);

      await runner.run();

      expect(fileSystem.exists('/output/a')).toBe(true);
      expect(fileSystem.exists('/output/a/b')).toBe(true);
      expect(fileSystem.exists('/output/a/b/c')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete Kubernetes manifest generation workflow', async () => {
      const files = [
        createFile(
          'output/app/Deployment_deployment.yml',
          'app.deployment',
          'apiVersion: apps/v1\nkind: Deployment\n---\n'
        ),
        createFile('output/app/Service_service.yml', 'app.service', 'apiVersion: v1\nkind: Service\n---\n'),
        createFile(
          'output/db/StatefulSet_statefulset.yml',
          'db.statefulset',
          'apiVersion: apps/v1\nkind: StatefulSet\n---\n'
        ),
      ];

      const runner = new GenerateRunner(
        createOptions(),
        createGenerateOptions({ outputMode: 'resource' }),
        files,
        mockLogger,
        fileSystem
      );

      await runner.run();

      const writtenFiles = fileSystem.getWrittenFiles();

      // Verify files were written
      expect(writtenFiles['/output/app/Deployment_deployment.yml']).toContain('kind: Deployment');
      expect(writtenFiles['/output/app/Service_service.yml']).toContain('kind: Service');
      expect(writtenFiles['/output/db/StatefulSet_statefulset.yml']).toContain('kind: StatefulSet');

      // Verify directory structure
      expect(fileSystem.exists('/output/app')).toBe(true);
      expect(fileSystem.exists('/output/db')).toBe(true);

      // Verify file count
      expect(Object.keys(writtenFiles)).toHaveLength(3);
    });

    it('should handle multiple runs with cleaning', async () => {
      const files1 = [createFile('output/run1.yml', 'app.deployment', 'first run')];
      const files2 = [createFile('output/run2.yml', 'db.statefulset', 'second run')];

      // First run
      const runner1 = new GenerateRunner(
        createOptions(),
        createGenerateOptions({ cleanOutputDir: true }),
        files1,
        mockLogger,
        fileSystem
      );
      await runner1.run();

      expect(fileSystem.getWrittenFiles()['/output/run1.yml']).toBe('first run');

      // Second run should clean and write new files
      const runner2 = new GenerateRunner(
        createOptions(),
        createGenerateOptions({ cleanOutputDir: true }),
        files2,
        mockLogger,
        fileSystem
      );
      await runner2.run();

      // First run files should be gone
      expect(fileSystem.exists('/output/run1.yml')).toBe(false);
      // Second run files should exist
      expect(fileSystem.getWrittenFiles()['/output/run2.yml']).toBe('second run');
    });

    it('should work with NodeFileSystem default', async () => {
      const files = [createFile('output/test.yml', 'app.deployment', 'content')];

      // Create runner without passing fileSystem (should use NodeFileSystem)
      const runner = new GenerateRunner(
        createOptions(),
        createGenerateOptions({ cleanOutputDir: false }),
        files,
        mockLogger
        // No fileSystem parameter - will use NodeFileSystem by default
      );

      // This test just verifies the constructor works without fileSystem parameter
      expect(runner).toBeDefined();
      expect(runner.options).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle files with same name in different directories', async () => {
      const files = [
        createFile('output/app/file.yml', 'app.deployment', 'app content'),
        createFile('output/db/file.yml', 'db.statefulset', 'db content'),
      ];

      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), files, mockLogger, fileSystem);

      await runner.run();

      expect(fileSystem.getWrittenFiles()['/output/app/file.yml']).toBe('app content');
      expect(fileSystem.getWrittenFiles()['/output/db/file.yml']).toBe('db content');
    });

    it('should handle empty content', async () => {
      const files = [createFile('output/empty.yml', 'app.deployment', '')];

      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), files, mockLogger, fileSystem);

      await runner.run();

      expect(fileSystem.getWrittenFiles()['/output/empty.yml']).toBe('');
    });

    it('should handle very long file paths', async () => {
      const longPath = 'output/' + 'a/'.repeat(10) + 'file.yml';
      const files = [createFile(longPath, 'app.deployment', 'content')];

      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), files, mockLogger, fileSystem);

      await runner.run();

      expect(fileSystem.getWrittenFiles()[`/${longPath}`]).toBe('content');
    });

    it('should show singular form for one file', async () => {
      const files = [createFile('output/app.yml', 'app.deployment', 'content')];

      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), files, mockLogger, fileSystem);

      await runner.run();

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Generated 1 file into'));
    });

    it('should show plural form for multiple files', async () => {
      const files = [
        createFile('app.yml', 'app.deployment', 'content1'),
        createFile('db.yml', 'db.statefulset', 'content2'),
      ];

      const runner = new GenerateRunner(createOptions(), createGenerateOptions(), files, mockLogger, fileSystem);

      await runner.run();

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Generated 2 files into'));
    });
  });
});
