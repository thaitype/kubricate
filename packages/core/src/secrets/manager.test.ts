/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import {
  collectSecretManagers,
  validateSecretManagers,
  prepareSecretEffects,
  type MergedSecretManager,
} from './manager.js';

describe('collectSecretManagers', () => {
  it('collects all secret managers from config', () => {
    const config = {
      stacks: {
        stack1: {
          getSecretManagers: () => ({
            default: { id: 's1' },
          }),
        },
        stack2: {
          getSecretManagers: () => ({
            foo: { id: 's2' },
          }),
        },
      },
    };

    const result = collectSecretManagers(config as any);
    expect(result).toHaveProperty('stack1.default');
    expect(result).toHaveProperty('stack2.foo');
  });
});

describe('validateSecretManagers', () => {
  it('calls loader.load and loader.get for each secret', async () => {
    const fakeLoader = {
      load: vi.fn(async () => {}),
      get: vi.fn(() => 'resolved-secret'),
    };

    const managers: MergedSecretManager = {
      'app.default': {
        name: 'default',
        stackName: 'app',
        secretManager: {
          getSecrets: () => ({
            mySecret: { loader: 'env' },
          }),
          resolveLoader: () => fakeLoader,
        } as any,
      },
    };

    await validateSecretManagers(managers, {});
    expect(fakeLoader.load).toHaveBeenCalledWith(['mySecret']);
    expect(fakeLoader.get).toHaveBeenCalledWith('mySecret');
  });
});

describe('prepareSecretEffects', () => {
  it('resolves secrets and prepares effects from providers', async () => {
    const fakeLoader = {
      load: vi.fn(async () => {}),
      get: vi.fn(() => 'secret-value'),
    };

    const fakeProvider = {
      prepare: vi.fn(() => [{ type: 'manual', value: 'effect' }]),
    };

    const managers: MergedSecretManager = {
      'admin.default': {
        name: 'default',
        stackName: 'admin',
        secretManager: {
          getSecrets: () => ({
            token: { loader: 'env', provider: 'k8s' },
          }),
          resolveLoader: () => fakeLoader,
          resolveProvider: () => fakeProvider,
        } as any,
      },
    };

    const effects = await prepareSecretEffects(managers, {});
    expect(fakeLoader.load).toHaveBeenCalledWith(['token']);
    expect(fakeLoader.get).toHaveBeenCalledWith('token');
    expect(fakeProvider.prepare).toHaveBeenCalledWith('token', 'secret-value');
    expect(effects).toEqual([{ type: 'manual', value: 'effect' }]);
  });
});
