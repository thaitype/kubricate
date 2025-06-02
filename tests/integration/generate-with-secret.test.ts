import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runGenerate } from '../helpers/execute-kubricate';

const rootDir = path.resolve(__dirname, '..');
const fixturesRoot = path.join(rootDir, 'fixtures');

describe('CLI Integration (Generate with Secret Manager)', () => {
  const fixturesDir = path.join(fixturesRoot, 'generate-with-secret-manager');

  it('should inject secrets into deployment correctly', async () => {
    const { stdout, exitCode } = await runGenerate({
      root: fixturesDir,
      stdout: true,
    });

    expect(exitCode).toBe(0);

    // 🌟 Check basic deployment structure
    expect(stdout).toContain('apiVersion: apps/v1');
    expect(stdout).toContain('kind: Deployment');
    expect(stdout).toContain('name: my-app');
    expect(stdout).toContain('namespace: my-namespace');

    // 🌟 Check labels and annotations injected
    expect(stdout).toContain('kubricate.thaitype.dev/stack-id: frontend');
    expect(stdout).toContain('kubricate.thaitype.dev/resource-id: deployment');

    // 🌟 Check secrets injected into env
    expect(stdout).toContain('secretKeyRef');
    expect(stdout).toContain('name: secret-application');
    expect(stdout).toContain('key: my_app_key');
    expect(stdout).toContain('name: API_KEY');
    expect(stdout).toContain('key: my_app_key_2');
    expect(stdout).toContain('name: API_KEY_2');
  });
});

describe('CLI Integration (Generate with Secret Registry)', () => {
  const fixturesDir = path.join(fixturesRoot, 'generate-with-secret-registry');

  it('should inject secrets into deployment correctly', async () => {
    const { stdout, exitCode } = await runGenerate({
      root: fixturesDir,
      stdout: true,
    });

    expect(exitCode).toBe(0);

    // 🌟 Check basic deployment structure
    expect(stdout).toContain('apiVersion: apps/v1');
    expect(stdout).toContain('kind: Deployment');
    expect(stdout).toContain('name: my-app');
    expect(stdout).toContain('namespace: my-namespace');

    // 🌟 Check labels and annotations injected
    expect(stdout).toContain('kubricate.thaitype.dev/stack-id: frontend');
    expect(stdout).toContain('kubricate.thaitype.dev/resource-id: deployment');

    // 🌟 Check secrets injected into env
    expect(stdout).toContain('secretKeyRef');
    expect(stdout).toContain('name: secret-application');
    expect(stdout).toContain('key: my_app_key');
    expect(stdout).toContain('name: API_KEY');
    expect(stdout).toContain('key: my_app_key_2');
    expect(stdout).toContain('name: API_KEY_2');

    // 🌟 Check Docker pull secret injected
    expect(stdout).toContain('imagePullSecrets');
    expect(stdout).toContain('name: secret-application-provider');
  });
});
