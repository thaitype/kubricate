import fs from 'node:fs/promises';
import path from 'node:path';

import { rimraf } from 'rimraf';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { executeKubricate } from '../helpers/execute-kubricate';

const rootDir = path.resolve(__dirname, '..');
const fixturesRoot = path.join(rootDir, 'fixtures');

describe('generate-metadata e2e', () => {
  const fixtureDir = path.join(fixturesRoot, 'generate-metadata');
  const outputFile = 'src/metadata.gen.ts';
  const outputPath = path.join(fixtureDir, outputFile);

  beforeEach(async () => {
    // Create fixture directory structure
    await fs.mkdir(path.join(fixtureDir, 'src'), { recursive: true });

    // Create package.json
    const packageJson = {
      name: '@kubricate/test-package',
      version: '1.2.3',
      description: 'Test package for generate-metadata',
    };
    await fs.writeFile(path.join(fixtureDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');
  });

  afterEach(async () => {
    // Clean up fixture directory
    await rimraf(fixtureDir);
  });

  it('should generate metadata.gen.ts from package.json', async () => {
    const args = ['generate-metadata', '--cwd', fixtureDir];
    const { stdout, stderr, exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('generate-metadata');
    expect(stdout).toContain('Found version');
    expect(stdout).toContain('1.2.3');
    expect(stdout).toContain('Generated');
    expect(stdout).toContain('Done');
    expect(stderr).toBe('');

    // Verify file was created
    const fileExists = await fs
      .access(outputPath)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);

    // Verify file content
    const content = await fs.readFile(outputPath, 'utf-8');
    expect(content).toContain('Auto-generated metadata file');
    expect(content).toContain('DO NOT EDIT MANUALLY');
    expect(content).toContain('Generated from package.json by kubricate CLI');
    expect(content).toContain('Run `kubricate generate-metadata` to update this file');
    expect(content).toContain('export const metadata = {');
    expect(content).toContain("  version: '1.2.3',");
    expect(content).toContain('};');
  });

  it('should support custom outfile option', async () => {
    const customOutfile = 'lib/meta.gen.ts';
    const customOutputPath = path.join(fixtureDir, customOutfile);

    // Create lib directory
    await fs.mkdir(path.join(fixtureDir, 'lib'), { recursive: true });

    const args = ['generate-metadata', '--cwd', fixtureDir, '--outfile', customOutfile];
    const { exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);

    // Verify custom file was created
    const fileExists = await fs
      .access(customOutputPath)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);

    const content = await fs.readFile(customOutputPath, 'utf-8');
    expect(content).toContain("version: '1.2.3'");

    // Clean up
    await rimraf(path.join(fixtureDir, 'lib'));
  });

  it('should support custom field option', async () => {
    // Update package.json with custom field
    const packageJson = {
      name: '@kubricate/test-package',
      version: '1.2.3',
      customField: 'custom-value-123',
    };
    await fs.writeFile(path.join(fixtureDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

    const args = ['generate-metadata', '--cwd', fixtureDir, '--field', 'customField'];
    const { stdout, exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Found customField');
    expect(stdout).toContain('custom-value-123');

    const content = await fs.readFile(outputPath, 'utf-8');
    expect(content).toContain("version: 'custom-value-123'");
  });

  it('should overwrite existing metadata.gen.ts', async () => {
    // Create existing metadata file with old version
    const oldContent = `export const metadata = { version: '0.0.1' };`;
    await fs.writeFile(outputPath, oldContent, 'utf-8');

    const args = ['generate-metadata', '--cwd', fixtureDir];
    const { exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);

    // Verify file was updated
    const content = await fs.readFile(outputPath, 'utf-8');
    expect(content).toContain("version: '1.2.3'");
    expect(content).not.toContain("version: '0.0.1'");
  });

  it('should show verbose output when --verbose flag is used', async () => {
    const args = ['generate-metadata', '--cwd', fixtureDir, '--verbose'];
    const { stdout, exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Reading package.json from:');
    expect(stdout).toContain('Writing metadata file to:');
    expect(stdout).toContain('package.json');
    expect(stdout).toContain('metadata.gen.ts');
  });

  it('should handle error when package.json does not exist', async () => {
    // Remove package.json
    await fs.unlink(path.join(fixtureDir, 'package.json'));

    const args = ['generate-metadata', '--cwd', fixtureDir];
    const { stderr, exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Failed to read package.json');
  });

  it('should handle error when field does not exist', async () => {
    // Create package.json without version field
    const packageJson = { name: '@kubricate/test-package' };
    await fs.writeFile(path.join(fixtureDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

    const args = ['generate-metadata', '--cwd', fixtureDir];
    const { stderr, exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Field "version" not found or is not a string');
  });

  it('should handle error when field is not a string', async () => {
    // Create package.json with non-string version
    const packageJson = { name: '@kubricate/test-package', version: 123 };
    await fs.writeFile(path.join(fixtureDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

    const args = ['generate-metadata', '--cwd', fixtureDir];
    const { stderr, exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Field "version" not found or is not a string');
  });

  it('should create output directory if it does not exist', async () => {
    // Remove src directory
    await rimraf(path.join(fixtureDir, 'src'));

    const args = ['generate-metadata', '--cwd', fixtureDir];
    const { exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);

    // Verify file was created in newly created directory
    const fileExists = await fs
      .access(outputPath)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);
  });

  it('should handle deeply nested output paths', async () => {
    const deepOutfile = 'dist/esm/lib/metadata.gen.ts';
    const deepOutputPath = path.join(fixtureDir, deepOutfile);

    const args = ['generate-metadata', '--cwd', fixtureDir, '--outfile', deepOutfile];
    const { exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);

    // Verify file was created in nested directory
    const fileExists = await fs
      .access(deepOutputPath)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);

    const content = await fs.readFile(deepOutputPath, 'utf-8');
    expect(content).toContain("version: '1.2.3'");
  });
});
