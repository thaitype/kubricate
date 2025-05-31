import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runGenerate } from '../helpers/execute-kubricate';

const rootDir = path.resolve(__dirname, '..');
const fixturesRoot = path.join(rootDir, 'fixtures');
const fixturesDir = path.join(fixturesRoot, 'generate-output-stack');

describe('CLI Integration (Generate to stdout)', () => {
  it('should print manifests to stdout', async () => {
    const { stdout, exitCode } = await runGenerate({ root: fixturesDir, stdout: true });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('apiVersion:'); // because YAML printed
    expect(stdout).toContain('kind: Namespace'); // minimal check
  });
});

describe('CLI Integration (Generate to stdout with filters)', () => {
  it('should print only namespace resource', async () => {
    const { stdout, exitCode } = await runGenerate({
      root: fixturesDir,
      stdout: true,
      filters: ['namespace'],
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('kind: Namespace');
    expect(stdout).not.toContain('Deployment'); // should be filtered out
  });

  it('should print multiple resources (namespace + frontend.service)', async () => {
    const { stdout, exitCode } = await runGenerate({
      root: fixturesDir,
      stdout: true,
      filters: ['namespace', 'frontend.service'],
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('kind: Namespace');
    expect(stdout).toContain('kind: Service');
  });
});
