/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecretManagerEngine, type EffectsOptions } from './SecretManagerEngine.js';
import type { SecretManager } from '../SecretManager.js';

describe('SecretManagerEngine', () => {
  let mockSecretManager: SecretManager;
  let mockConnector: any;
  let mockProvider: any;
  let mockLogger: any;
  let effectsOptions: EffectsOptions;
  let config: any;

  beforeEach(() => {
    mockConnector = {
      getWorkingDir: vi.fn(() => undefined),
      setWorkingDir: vi.fn(),
      load: vi.fn(() => Promise.resolve()),
      get: vi.fn((key) => ({ value: `secret-${key}` })),
    };

    mockProvider = {
      prepare: vi.fn((name, value) => [{ type: 'kubectl', value }]),
    };

    mockSecretManager = {
      getSecrets: vi.fn(() => ({ DB_PASSWORD: { name: 'mock', connector: 'env', provider: 'k8s' } })),
      resolveConnector: vi.fn(() => mockConnector),
      resolveProvider: vi.fn(() => mockProvider),
    } as any;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    effectsOptions = { workingDir: '/test' };

    config = {
      stacks: {
        auth: {
          getSecretManagers: () => ({ main: mockSecretManager }),
        },
      },
    };
  });

  it('should collect secret managers from config', () => {
    const engine = new SecretManagerEngine({config, effectOptions: effectsOptions, logger: mockLogger});
    const result = engine.collect();
    expect(Object.keys(result)).toContain('auth.main');
    expect(result['auth.main'].secretManager).toBe(mockSecretManager);
  });

  it('should validate secret managers', async () => {
    const engine = new SecretManagerEngine({config, effectOptions: effectsOptions, logger: mockLogger});
    const managers = engine.collect();
    await engine.validate(managers);
    expect(mockConnector.load).toHaveBeenCalledWith(['DB_PASSWORD']);
    expect(mockConnector.get).toHaveBeenCalledWith('DB_PASSWORD');
  });

  it('should prepare effects correctly', async () => {
    const engine = new SecretManagerEngine({config, effectOptions: effectsOptions, logger: mockLogger});
    const managers = engine.collect();
    const effects = await engine.prepareEffects(managers);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('kubectl');
    expect(effects[0].value.value).toBe('secret-DB_PASSWORD');
  });
});
