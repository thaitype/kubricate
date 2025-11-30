import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InMemoryFileSystem } from '../domain/InMemoryFileSystem.js';
import type { BaseLogger } from '../types/logger.js';
import { GenerateMetadataCommand, type GenerateMetadataCommandOptions } from './GenerateMetadataCommand.js';

describe('GenerateMetadataCommand', () => {
  let logger: BaseLogger;
  let fileSystem: InMemoryFileSystem;

  beforeEach(() => {
    logger = {
      level: 'info',
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    fileSystem = new InMemoryFileSystem();
  });

  const createOptions = (overrides?: Partial<GenerateMetadataCommandOptions>): GenerateMetadataCommandOptions => ({
    cwd: '/test',
    outfile: 'src/metadata.gen.ts',
    field: 'version',
    ...overrides,
  });

  const createPackageJson = (data: Record<string, unknown>) => JSON.stringify(data, null, 2);

  describe('execute', () => {
    it('should generate metadata.gen.ts from package.json', async () => {
      const packageJson = createPackageJson({ version: '1.0.0', name: 'test-package' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);
      fileSystem.mkdir('/test/src', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command.execute();

      const generatedContent = fileSystem.readFile('/test/src/metadata.gen.ts');
      expect(generatedContent).toContain("version: '1.0.0'");
      expect(generatedContent).toContain('Auto-generated metadata file');
      expect(generatedContent).toContain('DO NOT EDIT MANUALLY');
      expect(generatedContent).toContain('export const metadata = {');

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('generate-metadata'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Found version'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Generated'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Done'));
    });

    it('should use custom cwd option', async () => {
      const packageJson = createPackageJson({ version: '2.5.0' });
      fileSystem.mkdir('/custom/path', { recursive: true });
      fileSystem.writeFile('/custom/path/package.json', packageJson);
      fileSystem.mkdir('/custom/path/src', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions({ cwd: '/custom/path' }), logger, fileSystem);
      await command.execute();

      const generatedContent = fileSystem.readFile('/custom/path/src/metadata.gen.ts');
      expect(generatedContent).toContain("version: '2.5.0'");
    });

    it('should use custom outfile option', async () => {
      const packageJson = createPackageJson({ version: '1.0.0' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);
      fileSystem.mkdir('/test/lib', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions({ outfile: 'lib/meta.gen.ts' }), logger, fileSystem);
      await command.execute();

      const generatedContent = fileSystem.readFile('/test/lib/meta.gen.ts');
      expect(generatedContent).toContain("version: '1.0.0'");
      expect(fileSystem.exists('/test/src/metadata.gen.ts')).toBe(false);
    });

    it('should extract custom field from package.json', async () => {
      const packageJson = createPackageJson({
        version: '1.0.0',
        customField: 'custom-value',
      });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);
      fileSystem.mkdir('/test/src', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions({ field: 'customField' }), logger, fileSystem);
      await command.execute();

      const generatedContent = fileSystem.readFile('/test/src/metadata.gen.ts');
      expect(generatedContent).toContain("version: 'custom-value'");
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Found customField'));
    });

    it('should create output directory if it does not exist', async () => {
      const packageJson = createPackageJson({ version: '1.0.0' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command.execute();

      expect(fileSystem.exists('/test/src/metadata.gen.ts')).toBe(true);
      expect(fileSystem.exists('/test/src')).toBe(true);
    });

    it('should overwrite existing metadata.gen.ts', async () => {
      const packageJson = createPackageJson({ version: '2.0.0' });
      fileSystem.mkdir('/test/src', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);
      fileSystem.writeFile('/test/src/metadata.gen.ts', "export const metadata = { version: '1.0.0' };");

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command.execute();

      const generatedContent = fileSystem.readFile('/test/src/metadata.gen.ts');
      expect(generatedContent).toContain("version: '2.0.0'");
      expect(generatedContent).not.toContain("version: '1.0.0'");
    });

    it('should include proper template with instructions', async () => {
      const packageJson = createPackageJson({ version: '1.0.0' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);
      fileSystem.mkdir('/test/src', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command.execute();

      const generatedContent = fileSystem.readFile('/test/src/metadata.gen.ts');
      expect(generatedContent).toContain('/**');
      expect(generatedContent).toContain(' * Auto-generated metadata file.');
      expect(generatedContent).toContain(' * DO NOT EDIT MANUALLY.');
      expect(generatedContent).toContain(' *');
      expect(generatedContent).toContain(' * Generated from package.json by kubricate-local CLI.');
      expect(generatedContent).toContain(' * Run `kubricate-local generate-metadata` to update this file.');
      expect(generatedContent).toContain(' */');
      expect(generatedContent).toContain('export const metadata = {');
      expect(generatedContent).toContain("  version: '1.0.0',");
      expect(generatedContent).toContain('};');
    });

    it('should handle deeply nested output directory', async () => {
      const packageJson = createPackageJson({ version: '1.0.0' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);

      const command = new GenerateMetadataCommand(
        createOptions({ outfile: 'dist/esm/lib/metadata.gen.ts' }),
        logger,
        fileSystem
      );
      await command.execute();

      const generatedContent = fileSystem.readFile('/test/dist/esm/lib/metadata.gen.ts');
      expect(generatedContent).toContain("version: '1.0.0'");
      expect(fileSystem.exists('/test/dist/esm/lib')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error if package.json does not exist', async () => {
      fileSystem.mkdir('/test', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);

      await expect(command.execute()).rejects.toThrow('Failed to read package.json');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error:'));
    });

    it('should throw error if package.json is invalid JSON', async () => {
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', 'invalid json {{{');

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);

      await expect(command.execute()).rejects.toThrow('Failed to read package.json');
    });

    it('should throw error if field does not exist in package.json', async () => {
      const packageJson = createPackageJson({ name: 'test-package' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);

      const command = new GenerateMetadataCommand(createOptions({ field: 'version' }), logger, fileSystem);

      await expect(command.execute()).rejects.toThrow('Field "version" not found or is not a string');
    });

    it('should throw error if field is not a string', async () => {
      const packageJson = createPackageJson({ version: 123 });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);

      await expect(command.execute()).rejects.toThrow('Field "version" not found or is not a string');
    });

    it('should throw error if field is null', async () => {
      const packageJson = createPackageJson({ version: null });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);

      await expect(command.execute()).rejects.toThrow('Field "version" not found or is not a string');
    });

    it('should throw error if field is undefined', async () => {
      const packageJson = createPackageJson({});
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);

      await expect(command.execute()).rejects.toThrow('Field "version" not found or is not a string');
    });

    it('should throw error if field is empty string', async () => {
      const packageJson = createPackageJson({ version: '' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);

      await expect(command.execute()).rejects.toThrow('Field "version" not found or is not a string');
    });

    it('should log error message when execution fails', async () => {
      fileSystem.mkdir('/test', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);

      await expect(command.execute()).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error:'));
    });
  });

  describe('debug logging', () => {
    it('should log debug information about file paths', async () => {
      const packageJson = createPackageJson({ version: '1.0.0' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);
      fileSystem.mkdir('/test/src', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command.execute();

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Reading package.json from:'));
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('/test/package.json'));
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Writing metadata file to:'));
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('/test/src/metadata.gen.ts'));
    });
  });

  describe('edge cases', () => {
    it('should handle version with special characters', async () => {
      const packageJson = createPackageJson({ version: '1.0.0-beta.1+build.123' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);
      fileSystem.mkdir('/test/src', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command.execute();

      const generatedContent = fileSystem.readFile('/test/src/metadata.gen.ts');
      expect(generatedContent).toContain("version: '1.0.0-beta.1+build.123'");
    });

    it('should handle multiple sequential runs', async () => {
      const packageJson1 = createPackageJson({ version: '1.0.0' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson1);
      fileSystem.mkdir('/test/src', { recursive: true });

      const command1 = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command1.execute();

      let generatedContent = fileSystem.readFile('/test/src/metadata.gen.ts');
      expect(generatedContent).toContain("version: '1.0.0'");

      // Update package.json
      const packageJson2 = createPackageJson({ version: '2.0.0' });
      fileSystem.writeFile('/test/package.json', packageJson2);

      const command2 = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command2.execute();

      generatedContent = fileSystem.readFile('/test/src/metadata.gen.ts');
      expect(generatedContent).toContain("version: '2.0.0'");
      expect(generatedContent).not.toContain("version: '1.0.0'");
    });

    it('should work with @kubricate/core package structure', async () => {
      const packageJson = createPackageJson({
        name: '@kubricate/core',
        version: '0.22.0',
        description: 'Core utilities',
      });
      fileSystem.mkdir('/packages/core', { recursive: true });
      fileSystem.writeFile('/packages/core/package.json', packageJson);
      fileSystem.mkdir('/packages/core/src', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions({ cwd: '/packages/core' }), logger, fileSystem);
      await command.execute();

      const generatedContent = fileSystem.readFile('/packages/core/src/metadata.gen.ts');
      expect(generatedContent).toContain("version: '0.22.0'");
    });

    it('should work with @kubricate/stacks package structure', async () => {
      const packageJson = createPackageJson({
        name: '@kubricate/stacks',
        version: '0.22.0',
        description: 'Reusable stack templates',
      });
      fileSystem.mkdir('/packages/stacks', { recursive: true });
      fileSystem.writeFile('/packages/stacks/package.json', packageJson);
      fileSystem.mkdir('/packages/stacks/src', { recursive: true });

      const command = new GenerateMetadataCommand(createOptions({ cwd: '/packages/stacks' }), logger, fileSystem);
      await command.execute();

      const generatedContent = fileSystem.readFile('/packages/stacks/src/metadata.gen.ts');
      expect(generatedContent).toContain("version: '0.22.0'");
    });

    it('should handle when parent directory exists but output directory does not', async () => {
      const packageJson = createPackageJson({ version: '1.0.0' });
      fileSystem.mkdir('/test', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);
      // Don't create src directory

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command.execute();

      expect(fileSystem.exists('/test/src')).toBe(true);
      expect(fileSystem.exists('/test/src/metadata.gen.ts')).toBe(true);
    });

    it('should not create directory if it already exists', async () => {
      const packageJson = createPackageJson({ version: '1.0.0' });
      fileSystem.mkdir('/test/src', { recursive: true });
      fileSystem.writeFile('/test/package.json', packageJson);

      const command = new GenerateMetadataCommand(createOptions(), logger, fileSystem);
      await command.execute();

      // Should not throw error
      expect(fileSystem.exists('/test/src/metadata.gen.ts')).toBe(true);
    });
  });
});
