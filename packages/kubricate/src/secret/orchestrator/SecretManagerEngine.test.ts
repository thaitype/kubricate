/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SecretManager } from '../SecretManager.js';
import { SecretRegistry } from '../SecretRegistry.js';
import { SecretManagerEngine, type EffectsOptions } from './SecretManagerEngine.js';

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
      get: vi.fn(key => ({ value: `secret-${key}` })),
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
      secret: {
        secretSpec: mockSecretManager,
      },
    };
  });

  it('should collect secret managers from config', () => {
    const engine = new SecretManagerEngine({ config, effectOptions: effectsOptions, logger: mockLogger });
    const result = engine.collect();
    expect(Object.keys(result)).toContain('default');
    expect(result['default'].secretManager).toBe(mockSecretManager);
  });

  it('should validate secret managers', async () => {
    const engine = new SecretManagerEngine({ config, effectOptions: effectsOptions, logger: mockLogger });
    const managers = engine.collect();
    await engine.validate(managers);
    expect(mockConnector.load).toHaveBeenCalledWith(['DB_PASSWORD']);
    expect(mockConnector.get).toHaveBeenCalledWith('DB_PASSWORD');
  });

  it('should prepare effects correctly', async () => {
    const engine = new SecretManagerEngine({ config, effectOptions: effectsOptions, logger: mockLogger });
    const managers = engine.collect();
    const effects = await engine.prepareEffects(managers);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('kubectl');
    expect(effects[0].value.value).toBe('secret-DB_PASSWORD');
  });
});

describe('SecretManagerEngine.collect()', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  it('collects a single manager (legacy mode)', () => {
    const manager = new SecretManager();
    const engine = new SecretManagerEngine({
      logger: mockLogger as any,
      effectOptions: {},
      config: {
        secret: { secretSpec: manager },
        stacks: {},
      },
    });

    const result = engine.collect();

    expect(result).toEqual({
      default: { name: 'default', secretManager: manager },
    });
  });

  it('collects multiple managers from registry', () => {
    const registry = new SecretRegistry().add('svc1', new SecretManager()).add('svc2', new SecretManager());

    const engine = new SecretManagerEngine({
      logger: mockLogger as any,
      effectOptions: {},
      config: {
        secret: { secretSpec: registry },
        stacks: {},
      },
    });

    const result = engine.collect();

    expect(Object.keys(result)).toEqual(['svc1', 'svc2']);
    expect(result.svc1.secretManager).toBeInstanceOf(SecretManager);
    expect(result.svc2.secretManager).toBeInstanceOf(SecretManager);
  });

  it('throws if neither manager nor registry are defined', () => {
    const engine = new SecretManagerEngine({
      logger: mockLogger as any,
      effectOptions: {},
      config: {
        secret: {},
        stacks: {},
      },
    });

    expect(() => engine.collect()).toThrowError(/No secret manager or secret registry/);
  });
});
