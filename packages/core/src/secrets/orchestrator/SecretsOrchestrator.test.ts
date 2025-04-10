/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecretsOrchestrator } from './SecretsOrchestrator.js';
import type { SecretsOrchestratorOptions } from './types.js';
import { SecretManager } from '../SecretManager.js';
import type { PreparedEffect } from '../providers/BaseProvider.js';
import { InMemoryProvider } from '../providers/InMemoryProvider.js';
import { InMemoryLoader } from '../loaders/InMemoryLoader.js';

describe('SecretsOrchestrator', () => {
  let mockSecretManager: SecretManager;
  let mockProvider: any;
  let orchestrator: SecretsOrchestrator;
  let mockLogger: any;
  let options: SecretsOrchestratorOptions;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    mockProvider = {
      name: 'kubernetes', // This is critical
      secretType: 'Kubricate.InMemory', // Or your desired secretType
      allowMerge: true,
      getEffectIdentifier: (effect: PreparedEffect) => effect.value?.metadata?.name ?? 'no-id',
      prepare: vi.fn((name, value) => [{
        providerName: 'kubernetes',
        type: 'kubectl',
        value: {
          kind: 'Secret',
          metadata: { name: 'test-secret', provider: 'kubernetes' },
          data: { [name]: value }
        }
      }]),
      mergeSecrets: vi.fn((effects: PreparedEffect[]) => effects)
    };

    mockSecretManager = {
      getSecrets: vi.fn(() => ({
        DB_PASS: { name: 'DB_PASS', loader: 'env', provider: 'kubernetes' }
      })),
      resolveLoader: vi.fn(() => ({
        getWorkingDir: () => undefined,
        setWorkingDir: vi.fn(),
        load: vi.fn(() => Promise.resolve()),
        get: vi.fn(() => 's3cr3t')
      })) as any,
      resolveProvider: vi.fn(() => mockProvider)
    } as any;

    options = {
      config: {
        stacks: {
          api: {
            getSecretManagers: () => ({
              main: mockSecretManager
            })
          } as any
        },
        secrets: {
          merge: {
            intraProvider: 'autoMerge',
            crossProvider: 'error',
            intraStack: 'error',
            crossStack: 'error',
          }
        }
      },
      logger: mockLogger,
      effectOptions: { workingDir: '/project' }
    };

    orchestrator = SecretsOrchestrator.create(options);
  });

  it('should validate secrets without errors', async () => {
    await expect(orchestrator.validate()).resolves.not.toThrow();
    expect(mockSecretManager.resolveLoader).toHaveBeenCalled();
  });

  it('should apply and return prepared effects', async () => {
    const effects = await orchestrator.apply();
    expect(effects).toHaveLength(1);
    expect(effects[0].value.kind).toBe('Secret');
    expect(mockProvider.prepare).toHaveBeenCalled();
    expect(mockProvider.mergeSecrets).toHaveBeenCalled();
  });

  it('should cache provider in resolveProviderByName()', () => {
    const provider = orchestrator['resolveProviderByName']('kubernetes');
    expect(provider).toBe(mockProvider);
    const cached = orchestrator['providerCache'].get('kubernetes');
    expect(cached).toBe(mockProvider);
  });

  it('should throw if provider name is not found', () => {
    expect(() => orchestrator['resolveProviderByName']('not-exist')).toThrowError(
      '[SecretsOrchestrator] Provider "not-exist" not found in any registered SecretManager'
    );
  });
});


describe('SecretsOrchestrator Multi-Level Merge Strategy', () => {
  let mockLogger: any;
  let mockProvider: any;
  let mockSecretManager: (name: string, secrets: Record<string, any>) => SecretManager;
  let orchestrator: SecretsOrchestrator;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    mockProvider = {
      name: 'kubernetes', // This is critical
      secretType: 'Kubricate.InMemory', // Or your desired secretType
      allowMerge: true,
      getEffectIdentifier: (effect: PreparedEffect) => effect.value?.metadata?.name ?? 'no-id',
      prepare: vi.fn((name, value) => [{
        providerName: 'kubernetes',
        type: 'kubectl',
        value: {
          kind: 'Secret',
          metadata: { name: 'merged-secret', provider: 'kubernetes' },
          data: { [name]: value },
        }
      }]),
      mergeSecrets: vi.fn((effects: PreparedEffect[]) => effects),
    };

    mockSecretManager = (name: string, secrets: Record<string, any>): SecretManager => ({
      getSecrets: vi.fn(() => secrets),
      resolveLoader: vi.fn(() => ({
        getWorkingDir: () => undefined,
        setWorkingDir: vi.fn(),
        load: vi.fn(() => Promise.resolve()),
        get: vi.fn((key) => secrets[key].value),
      })),
      resolveProvider: vi.fn(() => mockProvider),
    }) as any;
  });

  it('snapshots multiple secrets from the same manager', async () => {
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          svc: mockSecretManager('svc', {
            DB_USER: { loader: 'env', provider: 'kubernetes', value: 'admin' },
            DB_PASS: { loader: 'env', provider: 'kubernetes', value: 's3cr3t' }
          }),
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          merge: {
            intraProvider: 'autoMerge',
            crossProvider: 'autoMerge',
            intraStack: 'autoMerge',
            crossStack: 'autoMerge',
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toMatchSnapshot();
  });

  it('throws on intraProvider conflict when strategy is "error"', async () => {
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          svc1: mockSecretManager('svc1', {
            SHARED_KEY: { loader: 'env', provider: 'kubernetes', value: 'one' },
          }),
          svc2: mockSecretManager('svc2', {
            SHARED_KEY: { loader: 'env', provider: 'kubernetes', value: 'two' },
          }),
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          merge: {
            intraProvider: 'error',
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);

    await expect(orchestrator.apply()).rejects.toThrowError(
      /\[merge:error:intraProvider\] Duplicate resource identifier "Kubricate.InMemory:merged-secret" from kubernetes/
    );
  });


});


describe('SecretsOrchestrator Advanced Merge Tests', () => {
  let mockLogger: any;
  let mockProvider: any;
  let mockSecretManager: (name: string, secrets: Record<string, any>) => SecretManager;
  let orchestrator: SecretsOrchestrator;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    mockProvider = {
      name: 'kubernetes', // This is critical
      secretType: 'Kubricate.InMemory', // Or your desired secretType
      allowMerge: true,
      getEffectIdentifier: (effect: PreparedEffect) => effect.value?.metadata?.name ?? 'no-id',
      prepare: vi.fn((name, value) => [{
        providerName: 'kubernetes',
        type: 'kubectl',
        value: {
          kind: 'Secret',
          metadata: { name: 'test', provider: 'kubernetes' },
          data: { [name]: JSON.stringify(value) },
        }
      }]),
      mergeSecrets: vi.fn((effects: PreparedEffect[]) => effects),
    };

    mockSecretManager = (name: string, secrets: Record<string, any>): SecretManager => ({
      getSecrets: vi.fn(() => secrets),
      resolveLoader: vi.fn(() => ({
        getWorkingDir: () => undefined,
        setWorkingDir: vi.fn(),
        load: vi.fn(() => Promise.resolve()),
        get: vi.fn((key) => secrets[key].value),
      })),
      resolveProvider: vi.fn(() => mockProvider),
    }) as any;
  });

  it('includes correct SecretOrigin metadata and snapshots effect', async () => {
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          svc: mockSecretManager('svc', {
            API_KEY: { loader: 'env', provider: 'kubernetes', value: '12345' }
          }),
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          merge: {
            intraProvider: 'autoMerge',
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toMatchSnapshot();
    expect(mockProvider.prepare).toHaveBeenCalledWith('API_KEY', '12345');
  });
});


describe('SecretsOrchestrator intraProvider', () => {
  let orchestrator: SecretsOrchestrator;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('should throw on intraProvider conflict with strategy "error"', async () => {
    const secretManager = new SecretManager()
      .addLoader('InMemoryLoader', new InMemoryLoader({
        my_app_key: 'my_app_key_value',
        my_app_key_2: 'my_app_key_2_value',
      }))
      .addProvider(
        'InMemoryProvider1',
        new InMemoryProvider({
          name: 'secret-application',
        })
      )
      .addProvider(
        'InMemoryProvider2',
        new InMemoryProvider({
          name: 'secret-application',
        })
      )
      .setDefaultProvider('InMemoryProvider1')
      .addSecret({ name: 'my_app_key', provider: 'InMemoryProvider1' })
      .addSecret({ name: 'my_app_key_2', provider: 'InMemoryProvider2' })
      .build();

    const stacks = {
      app: {
        getSecretManagers: () => ({
          default: secretManager,
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          merge: {
            intraProvider: 'error',
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);

    await expect(orchestrator.apply()).rejects.toThrowError(
      /\[merge:error:intraProvider\]/
    );
  });

  it('merges secrets across providers with same storeName when intraProvider is "autoMerge"', async () => {
    const secretManager = new SecretManager()
      .addLoader('InMemoryLoader', new InMemoryLoader({
        my_app_key: 'my_app_key_value',
        my_app_key_2: 'my_app_key_2_value',
      }))
      .addProvider(
        'InMemoryProvider1',
        new InMemoryProvider({
          name: 'secret-application',
        })
      )
      .addProvider(
        'InMemoryProvider2',
        new InMemoryProvider({
          name: 'secret-application',
        })
      )
      .setDefaultProvider('InMemoryProvider1')
      .addSecret({ name: 'my_app_key', provider: 'InMemoryProvider1' })
      .addSecret({ name: 'my_app_key_2', provider: 'InMemoryProvider2' })
      .build();

    const stacks = {
      app: {
        getSecretManagers: () => ({
          default: secretManager,
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          merge: {
            intraProvider: 'autoMerge',
          }
        }
      }
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1); // ✅ only one merged result

    const effect = effects[0];
    expect(effect.providerName).toBe('InMemoryProvider1'); // or InMemoryProvider2, doesn't matter
    expect(effect.value.storeName).toBe('secret-application');
    expect(effect.value.rawData).toEqual({
      my_app_key: 'my_app_key_value',
      my_app_key_2: 'my_app_key_2_value'
    });
  });


});
