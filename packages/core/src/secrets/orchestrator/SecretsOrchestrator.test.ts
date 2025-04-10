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




describe('SecretsOrchestrator intraProvider  (Integration Tests)', () => {
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
        SHARED_KEY: 'value1',
        SHARED_KEY_DUPLICATE: 'value2',
      }))
      .addProvider(
        'InMemoryProvider',
        new InMemoryProvider({ name: 'secret-application' })
      )
      .addSecret({ name: 'SHARED_KEY', provider: 'InMemoryProvider' })
      .addSecret({ name: 'SHARED_KEY_DUPLICATE', provider: 'InMemoryProvider' })
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
            intraProvider: 'error', // This will trigger the error
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);

    await expect(orchestrator.apply()).rejects.toThrowError(
      /\[merge:error:intraProvider\]/
    );
  });

  it('merges secrets within same provider when intraProvider is "autoMerge"', async () => {
    const secretManager = new SecretManager()
      .addLoader('InMemoryLoader', new InMemoryLoader({
        API_KEY: 'abc123',
        API_SECRET: 'shhh',
      }))
      .addProvider(
        'InMemoryProvider',
        new InMemoryProvider({ name: 'secret-application' })
      )
      .addSecret({ name: 'API_KEY', provider: 'InMemoryProvider' })
      .addSecret({ name: 'API_SECRET', provider: 'InMemoryProvider' })
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

    expect(effects).toHaveLength(1);
    expect(effects[0].value.storeName).toBe('secret-application');
    expect(effects[0].value.rawData).toEqual({
      API_KEY: 'abc123',
      API_SECRET: 'shhh',
    });
  });

  it('overwrites previous secret when intraProvider is "overwrite"', async () => {
    const secretManager = new SecretManager()
      .addLoader('InMemoryLoader', new InMemoryLoader({
        SHARED_KEY: 'value1',
        SHARED_KEY_DUPLICATE: 'value2',
      }))
      .addProvider(
        'InMemoryProvider',
        new InMemoryProvider({ name: 'secret-application' })
      )
      .addSecret({ name: 'SHARED_KEY', provider: 'InMemoryProvider' })
      .addSecret({ name: 'SHARED_KEY_DUPLICATE', provider: 'InMemoryProvider' })
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
            intraProvider: 'overwrite',
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    const effect = effects[0];

    // Should only contain last key (SHARED_KEY_DUPLICATE)
    expect(effect.value.rawData).toEqual({
      SHARED_KEY_DUPLICATE: 'value2',
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[merge:overwrite:intraProvider]')
    );
  });

  it('keeps last secret and logs dropped in overwrite strategy (intraProvider)', async () => {
    const secretManager = new SecretManager()
      .addLoader('InMemoryLoader', new InMemoryLoader({
        SHARED_KEY: 'v1',
        SHARED_KEY_DUPLICATE: 'v2',
      }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'secret-app' }))
      .addSecret({ name: 'SHARED_KEY', provider: 'InMemoryProvider' })
      .addSecret({ name: 'SHARED_KEY_DUPLICATE', provider: 'InMemoryProvider' })
      .build();
  
    const stacks = {
      app: {
        getSecretManagers: () => ({ default: secretManager }),
      }
    };
  
    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: { merge: { intraProvider: 'overwrite' } }
      }
    };
  
    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();
  
    expect(effects).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[merge:overwrite:intraProvider]'));
  });
  

});


describe('SecretsOrchestrator crossProvider (Integration Tests)', () => {
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
            crossProvider: 'error',
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);

    await expect(orchestrator.apply()).rejects.toThrowError(
      /\[merge:error:crossProvider\]/
    );
  });

  it('merges secrets across providers with same storeName when crossProvider is "autoMerge"', async () => {
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
            crossProvider: 'autoMerge',
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

  it('overwrites previous secret when crossProvider is "overwrite"', async () => {
    const secretManager = new SecretManager()
      .addLoader('InMemoryLoader', new InMemoryLoader({
        SHARED_KEY: 'one',
        SHARED_KEY_2: 'two',
      }))
      .addProvider('InMemoryProvider1', new InMemoryProvider({ name: 'secret-application' }))
      .addProvider('InMemoryProvider2', new InMemoryProvider({ name: 'secret-application' }))
      .setDefaultProvider('InMemoryProvider1')
      .addSecret({ name: 'SHARED_KEY', provider: 'InMemoryProvider1' })
      .addSecret({ name: 'SHARED_KEY_2', provider: 'InMemoryProvider2' })
      .build();

    const stacks = {
      app: {
        getSecretManagers: () => ({ default: secretManager }),
      },
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          merge: { crossProvider: 'overwrite' },
        },
      },
    };

    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(effects[0].value.rawData).toEqual({
      SHARED_KEY_2: 'two',
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[merge:overwrite:crossProvider]')
    );
  });


  it('keeps last secret and logs dropped in overwrite strategy (crossProvider)', async () => {
    const secretManager = new SecretManager()
      .addLoader('InMemoryLoader', new InMemoryLoader({
        SHARED_KEY: 'v1',
        SHARED_KEY_DUPLICATE: 'v2',
      }))
      .addProvider('InMemoryProvider1', new InMemoryProvider({ name: 'secret-app' }))
      .addProvider('InMemoryProvider2', new InMemoryProvider({ name: 'secret-app' }))
      .setDefaultProvider('InMemoryProvider1')
      .addSecret({ name: 'SHARED_KEY', provider: 'InMemoryProvider1' })
      .addSecret({ name: 'SHARED_KEY_DUPLICATE', provider: 'InMemoryProvider2' })
      .build();
  
    const stacks = {
      app: {
        getSecretManagers: () => ({ default: secretManager }),
      }
    };
  
    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: { merge: { crossProvider: 'overwrite' } }
      }
    };
  
    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();
  
    expect(effects).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[merge:overwrite:crossProvider]'));
  });
  

});


describe('SecretsOrchestrator intraStack (Integration Tests)', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('should throw on intraStack conflict with strategy "error"', async () => {
    const stack = {
      getSecretManagers: () => ({
        svc1: new SecretManager()
          .addLoader('InMemoryLoader', new InMemoryLoader({ KEY: 'A' }))
          .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
          .addSecret({ name: 'KEY', provider: 'InMemoryProvider' })
          .build(),
        svc2: new SecretManager()
          .addLoader('InMemoryLoader', new InMemoryLoader({ KEY: 'B' }))
          .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
          .addSecret({ name: 'KEY', provider: 'InMemoryProvider' })
          .build(),
      }),
    };

    const options = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: { app: stack as any },
        secrets: {
          merge: { intraStack: 'error' as const },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    await expect(orchestrator.apply()).rejects.toThrowError(/\[merge:error:intraStack]/);
  });

  it('merges on intraStack conflict with strategy "autoMerge"', async () => {
    const stack = {
      getSecretManagers: () => ({
        svc1: new SecretManager()
          .addLoader('InMemoryLoader', new InMemoryLoader({ KEY1: 'A' }))
          .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
          .addSecret({ name: 'KEY1', provider: 'InMemoryProvider' })
          .build(),
        svc2: new SecretManager()
          .addLoader('InMemoryLoader', new InMemoryLoader({ KEY2: 'B' }))
          .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
          .addSecret({ name: 'KEY2', provider: 'InMemoryProvider' })
          .build(),
      }),
    };

    const options = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: { app: stack as any },
        secrets: {
          merge: { intraStack: 'autoMerge' as const },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(effects[0].value.rawData).toEqual({
      KEY1: 'A',
      KEY2: 'B',
    });
  });

  it('overwrites previous secret when intraStack is "overwrite"', async () => {
    const stacks = {
      app: {
        getSecretManagers: () => ({
          a: new SecretManager()
            .addLoader('InMemoryLoader', new InMemoryLoader({ SHARED_KEY: 'one' }))
            .addProvider('P', new InMemoryProvider({ name: 'stack-secret' }))
            .addSecret({ name: 'SHARED_KEY', provider: 'P' })
            .build(),
          b: new SecretManager()
            .addLoader('InMemoryLoader', new InMemoryLoader({ SHARED_KEY: 'two' }))
            .addProvider('P', new InMemoryProvider({ name: 'stack-secret' }))
            .addSecret({ name: 'SHARED_KEY', provider: 'P' })
            .build(),
        }),
      },
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          merge: { intraStack: 'overwrite' },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(effects[0].value.rawData).toEqual({ SHARED_KEY: 'two' });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[merge:overwrite:intraStack]')
    );
  });

  it('keeps last secret and logs dropped in overwrite strategy (intraStack)', async () => {
    const stacks = {
      app: {
        getSecretManagers: () => ({
          svc1: new SecretManager()
            .addLoader('InMemoryLoader', new InMemoryLoader({ KEY: 'one' }))
            .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-app' }))
            .addSecret({ name: 'KEY' })
            .build(),
  
          svc2: new SecretManager()
            .addLoader('InMemoryLoader', new InMemoryLoader({ KEY: 'two' }))
            .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-app' }))
            .addSecret({ name: 'KEY' })
            .build()
        })
      }
    };
  
    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: { merge: { intraStack: 'overwrite' } }
      }
    };
  
    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();
  
    expect(effects).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[merge:overwrite:intraStack]'));
  });
  

});

describe('SecretsOrchestrator crossStack (Integration Tests)', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('should throw on crossStack conflict with strategy "error"', async () => {
    const stack1 = {
      getSecretManagers: () => ({
        svc: new SecretManager()
          .addLoader('InMemoryLoader', new InMemoryLoader({ DUPLICATE: 'a' }))
          .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
          .addSecret({ name: 'DUPLICATE', provider: 'InMemoryProvider' })
          .build(),
      }),
    };

    const stack2 = {
      getSecretManagers: () => ({
        svc: new SecretManager()
          .addLoader('InMemoryLoader', new InMemoryLoader({ DUPLICATE: 'b' }))
          .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
          .addSecret({ name: 'DUPLICATE', provider: 'InMemoryProvider' })
          .build(),
      }),
    };

    const options = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: {
          s1: stack1 as any,
          s2: stack2 as any,
        },
        secrets: {
          merge: { crossStack: 'error' as const },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    await expect(orchestrator.apply()).rejects.toThrowError(/\[merge:error:crossStack]/);
  });

  it('merges on crossStack conflict with strategy "autoMerge"', async () => {
    const stack1 = {
      getSecretManagers: () => ({
        svc: new SecretManager()
          .addLoader('InMemoryLoader', new InMemoryLoader({ KEY1: 'one' }))
          .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
          .addSecret({ name: 'KEY1', provider: 'InMemoryProvider' })
          .build(),
      }),
    };

    const stack2 = {
      getSecretManagers: () => ({
        svc: new SecretManager()
          .addLoader('InMemoryLoader', new InMemoryLoader({ KEY2: 'two' }))
          .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
          .addSecret({ name: 'KEY2', provider: 'InMemoryProvider' })
          .build(),
      }),
    };

    const options = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: {
          stack1: stack1 as any,
          stack2: stack2 as any,
        },
        secrets: {
          merge: { crossStack: 'autoMerge' as const },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(effects[0].value.rawData).toEqual({
      KEY1: 'one',
      KEY2: 'two',
    });
  });

  it('overwrites previous secret when crossStack is "overwrite"', async () => {
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          default: new SecretManager()
            .addLoader('InMemoryLoader', new InMemoryLoader({ SHARED_KEY: 'one' }))
            .addProvider('P', new InMemoryProvider({ name: 'stack-secret' }))
            .addSecret({ name: 'SHARED_KEY', provider: 'P' })
            .build(),
        }),
      },
      stack2: {
        getSecretManagers: () => ({
          default: new SecretManager()
            .addLoader('InMemoryLoader', new InMemoryLoader({ SHARED_KEY: 'two' }))
            .addProvider('P', new InMemoryProvider({ name: 'stack-secret' }))
            .addSecret({ name: 'SHARED_KEY', provider: 'P' })
            .build(),
        }),
      },
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          merge: { crossStack: 'overwrite' },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(effects[0].value.rawData).toEqual({ SHARED_KEY: 'two' });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[merge:overwrite:crossStack]')
    );
  });

  it('keeps last secret and logs dropped in overwrite strategy (crossStack)', async () => {
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          main: new SecretManager()
            .addLoader('InMemoryLoader', new InMemoryLoader({ KEY: 's1' }))
            .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-app' }))
            .addSecret({ name: 'KEY' })
            .build()
        }),
      },
      stack2: {
        getSecretManagers: () => ({
          main: new SecretManager()
            .addLoader('InMemoryLoader', new InMemoryLoader({ KEY: 's2' }))
            .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-app' }))
            .addSecret({ name: 'KEY' })
            .build()
        }),
      }
    };
  
    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: { merge: { crossStack: 'overwrite' } }
      }
    };
  
    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();
  
    expect(effects).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[merge:overwrite:crossStack]'));
  });
  

});


