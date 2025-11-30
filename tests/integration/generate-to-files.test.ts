import fs from 'node:fs/promises';
import path from 'node:path';

import { rimraf } from 'rimraf';
import { afterEach, describe, expect, it } from 'vitest';

import { executeKubricate } from '../helpers/execute-kubricate';

const rootDir = path.resolve(__dirname, '..');
const fixturesRoot = path.join(rootDir, 'fixtures');

const scenarios = [
  { name: 'Output Mode: Stack', fixture: 'generate-output-stack' },
  { name: 'Output Mode: Flat', fixture: 'generate-output-flat' },
  { name: 'Output Mode: Resource', fixture: 'generate-output-resource' },
  { name: 'Output Mode: Flat With Secret', fixture: 'generate-output-with-secret' },
] as const;

async function snapshotDirectory(dir: string, fixturePrefix: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(fixturePrefix, entry.name);

      if (entry.isDirectory()) {
        await snapshotDirectory(fullPath, relativePath);
      } else {
        const content = await fs.readFile(fullPath, 'utf-8');
        expect(content).toMatchSnapshot(relativePath);
      }
    })
  );
}

describe.each(scenarios)('CLI Integration ($name)', ({ fixture }) => {
  const fixturesDir = path.join(fixturesRoot, fixture);
  const outputDir = 'output';
  const outputFixtureDir = path.join(fixturesDir, outputDir);

  afterEach(async () => {
    await rimraf(outputFixtureDir);
  });

  it('should generate expected files', async () => {
    const args = ['generate', '--root', fixturesDir];
    const { stdout, exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Generating stacks');

    await snapshotDirectory(outputFixtureDir, `${fixture}/${outputDir}`);
  });
});

describe('CLI Integration (non-root directory)', () => {
  const fixture = 'generate-output-non-root-dir';
  const fixturesDir = path.join(fixturesRoot, fixture, 'example');
  const outputDir = 'output';
  const outputFixtureDir = path.join(fixturesDir, outputDir);

  afterEach(async () => {
    await rimraf(outputFixtureDir);
  });

  it('should generate expected files when run from different cwd', async () => {
    const differentCwd = path.join(fixturesRoot, fixture);
    const args = ['generate', '--root', './example'];
    
    const { stdout, exitCode } = await executeKubricate(args, { 
      reject: false,
      cwd: differentCwd 
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Generating stacks');

    await snapshotDirectory(outputFixtureDir, `${fixture}/example/${outputDir}`);
  });

  it('should generate expected files when --root is not provided (default to cwd)', async () => {
    const { stdout, exitCode } = await executeKubricate(['generate'], {
      reject: false,
      cwd: fixturesDir
    })

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Generating stacks');

    await snapshotDirectory(outputFixtureDir, `${fixture}/example/${outputDir}`);
  })
});
