/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecretsOrchestrator } from './SecretsOrchestrator.js';
import type { SecretsOrchestratorOptions } from './types.js';
import { SecretManager } from '../SecretManager.js';
import type { PreparedEffect } from '../providers/BaseProvider.js';
import { InMemoryProvider } from '../providers/InMemoryProvider.js';
import { InMemoryConnector } from '../connectors/InMemoryConnector.js';
import { SecretRegistry } from '../SecretRegistry.js';

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
        DB_PASS: { name: 'DB_PASS', connector: 'env', provider: 'kubernetes' }
      })),
      resolveConnector: vi.fn(() => ({
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
        secret: {
          conflict: {
            strategies: {
              intraProvider: 'autoMerge',
              crossProvider: 'error',
              crossManager: 'error',
            }
          },
          manager: mockSecretManager,
        }
      },
      logger: mockLogger,
      effectOptions: { workingDir: '/project' }
    } satisfies SecretsOrchestratorOptions;

    orchestrator = SecretsOrchestrator.create(options);
  });

  it('should validate secrets without errors', async () => {
    await expect(orchestrator.validate()).resolves.not.toThrow();
    expect(mockSecretManager.resolveConnector).toHaveBeenCalled();
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
      resolveConnector: vi.fn(() => ({
        getWorkingDir: () => undefined,
        setWorkingDir: vi.fn(),
        load: vi.fn(() => Promise.resolve()),
        get: vi.fn((key) => secrets[key].value),
      })),
      resolveProvider: vi.fn(() => mockProvider),
    }) as any;
  });

  it('snapshots multiple secrets from the same manager', async () => {
    const _mockSecretManager = mockSecretManager('svc', {
      DB_USER: { connector: 'env', provider: 'kubernetes', value: 'admin' },
      DB_PASS: { connector: 'env', provider: 'kubernetes', value: 's3cr3t' }
    })
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          svc: _mockSecretManager,
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secret: {
          conflict: {
            strategies: {
              intraProvider: 'autoMerge',
              crossProvider: 'autoMerge',
              crossManager: 'autoMerge',
            }
          },
          manager: _mockSecretManager,
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
      resolveConnector: vi.fn(() => ({
        getWorkingDir: () => undefined,
        setWorkingDir: vi.fn(),
        load: vi.fn(() => Promise.resolve()),
        get: vi.fn((key) => secrets[key].value),
      })),
      resolveProvider: vi.fn(() => mockProvider),
    }) as any;
  });

  it('includes correct SecretOrigin metadata and snapshots effect', async () => {
    const _mockSecretManager = mockSecretManager('svc', {
      API_KEY: { connector: 'env', provider: 'kubernetes', value: '12345' }
    })
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          svc: _mockSecretManager,
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secret: {
          conflict: {
            strategies: {
              intraProvider: 'autoMerge',
            }
          },
          manager: _mockSecretManager,
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
      .addConnector('InMemoryConnector', new InMemoryConnector({
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
        secret: {
          manager: secretManager,
          conflict: {
            strategies: {
              intraProvider: 'error', // This will trigger the error
            }
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);

    await expect(orchestrator.apply()).rejects.toThrowError(
      /\[conflict:error:intraProvider\]/
    );
  });

  it('merges secrets within same provider when intraProvider is "autoMerge"', async () => {
    const secretManager = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({
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
        secret: {
          manager: secretManager,
          conflict: {
            strategies: {
              intraProvider: 'autoMerge',
            }
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
      .addConnector('InMemoryConnector', new InMemoryConnector({
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
        secret: {
          manager: secretManager,
          conflict: {
            strategies: {
              intraProvider: 'overwrite',
            }
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
      expect.stringContaining('[conflict:overwrite:intraProvider]')
    );
  });

  it('keeps last secret and logs dropped in overwrite strategy (intraProvider)', async () => {
    const secretManager = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({
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
        secret: {
          manager: secretManager,
          conflict: { strategies: { intraProvider: 'overwrite' } }
        }
      }
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[conflict:overwrite:intraProvider]'));
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
      .addConnector('InMemoryConnector', new InMemoryConnector({
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
        secret: {
          manager: secretManager,
          conflict: {
            strategies: {
              crossProvider: 'error',
            }
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);

    await expect(orchestrator.apply()).rejects.toThrowError(
      /\[conflict:error:crossProvider\]/
    );
  });

  it('merges secrets across providers with same storeName when crossProvider is "autoMerge"', async () => {
    const secretManager = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({
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
        secret: {
          manager: secretManager,
          conflict: {
            strategies: {
              crossProvider: 'autoMerge',
            }
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
      .addConnector('InMemoryConnector', new InMemoryConnector({
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
        secret: {
          manager: secretManager,
          conflict: {
            strategies: { crossProvider: 'overwrite' },
          }
        },
      }
    };

    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(effects[0].value.rawData).toEqual({
      SHARED_KEY_2: 'two',
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[conflict:overwrite:crossProvider]')
    );
  });


  it('keeps last secret and logs dropped in overwrite strategy (crossProvider)', async () => {
    const secretManager = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({
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
        secret: {
          manager: secretManager,
          conflict: { strategies: { crossProvider: 'overwrite' } }
        }
      }
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[conflict:overwrite:crossProvider]'));
  });


});


describe('SecretsOrchestrator crossManager (Integration Tests)', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('should throw on crossManager conflict with strategy "error"', async () => {

    const svc1 = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ KEY: 'A' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
      .addSecret({ name: 'KEY', provider: 'InMemoryProvider' })
      .build();

    const svc2 = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ KEY: 'B' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
      .addSecret({ name: 'KEY', provider: 'InMemoryProvider' })
      .build();

    const stack = {
      getSecretManagers: () => ({
        svc1,
        svc2,
      }),
    };

    const secretRegistry = new SecretRegistry().add('svc1', svc1).add('svc2', svc2);

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: { app: stack as any },
        secret: {
          registry: secretRegistry,
          conflict: {
            strategies: { crossManager: 'error' as const },
          }
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    await expect(orchestrator.apply()).rejects.toThrowError(/\[conflict:error:crossManager]/);
  });

  it('merges on crossManager conflict with strategy "autoMerge"', async () => {
    const svc1 = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ KEY1: 'A' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
      .addSecret({ name: 'KEY1', provider: 'InMemoryProvider' })
      .build();

    const svc2 = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ KEY2: 'B' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared' }))
      .addSecret({ name: 'KEY2', provider: 'InMemoryProvider' })
      .build();

    const stack = {
      getSecretManagers: () => ({
        svc1,
        svc2,
      }),
    };

    const secretRegistry = new SecretRegistry().add('svc1', svc1).add('svc2', svc2);

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: { app: stack as any },
        secret: {
          registry: secretRegistry,
          conflict: {
            strategies: { crossManager: 'autoMerge' as const },
          }
        },
      }
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(effects[0].value.rawData).toEqual({
      KEY1: 'A',
      KEY2: 'B',
    });
  });

  it('should overwrite secret when conflict occurs within the same SecretManager (crossManager)', async () => {

    const a = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ SHARED_KEY: 'one' }))
      .addProvider('P', new InMemoryProvider({ name: 'stack-secret' }))
      .addSecret({ name: 'SHARED_KEY', provider: 'P' })
      .build();
    const b = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ SHARED_KEY: 'two' }))
      .addProvider('P', new InMemoryProvider({ name: 'stack-secret' }))
      .addSecret({ name: 'SHARED_KEY', provider: 'P' })
      .build();

    const stacks = {
      app: {
        getSecretManagers: () => ({
          a,
          b,
        }),
      },
    };

    const secretRegistry = new SecretRegistry().add('a', a).add('b', b);

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secret: {
          registry: secretRegistry,
          conflict: {
            strategies: { crossManager: 'overwrite' },
          }
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
  });

  it('merges same identifier across different SecretManagers with strategy "overwrite"', async () => {

    const svc1 = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ KEY: 'one' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-app' }))
      .addSecret({ name: 'KEY' })
      .build();

    const svc2 = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ KEY: 'two' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-app' }))
      .addSecret({ name: 'KEY' })
      .build();

    const stacks = {
      app: {
        getSecretManagers: () => ({
          svc1,
          svc2,
        })
      }
    };

    const secretRegistry = new SecretRegistry().add('svc1', svc1).add('svc2', svc2);

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secret: {
          registry: secretRegistry,
          conflict: { strategies: { crossManager: 'overwrite' } }
        }
      }
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[conflict:overwrite:crossManager]'));
  });


});

describe('SecretsOrchestrator crossManager (Integration Tests)', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('throws conflict when same identifier across managers and strategy = "error"', async () => {
    const svc1 = new SecretManager()
      .addConnector('InMemory', new InMemoryConnector({ KEY: 'value1' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-secret' }))
      .addSecret({ name: 'KEY' })
      .build();

    const svc2 = new SecretManager()
      .addConnector('InMemory', new InMemoryConnector({ KEY: 'value2' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-secret' }))
      .addSecret({ name: 'KEY' })
      .build();

    const secretRegistry = new SecretRegistry().add('svc1', svc1).add('svc2', svc2);

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: { app: { getSecretManagers: () => ({ svc1, svc2 }) } as any },
        secret: {
          registry: secretRegistry,
          conflict: { strategies: { crossManager: 'error' } },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    await expect(orchestrator.apply()).rejects.toThrowError(/\[conflict:error:crossManager]/);
  });

  it('overwrites when same identifier across managers and strategy = "overwrite"', async () => {
    const svc1 = new SecretManager()
      .addConnector('InMemory', new InMemoryConnector({ KEY: 'value1' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-secret' }))
      .addSecret({ name: 'KEY' })
      .build();

    const svc2 = new SecretManager()
      .addConnector('InMemory', new InMemoryConnector({ KEY: 'value2' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-secret' }))
      .addSecret({ name: 'KEY' })
      .build();

    const secretRegistry = new SecretRegistry().add('svc1', svc1).add('svc2', svc2);

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: { app: { getSecretManagers: () => ({ svc1, svc2 }) } as any },
        secret: {
          registry: secretRegistry,
          conflict: { strategies: { crossManager: 'overwrite' } },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[conflict:overwrite:crossManager]'));
  });

  it('auto-merges when different keys across managers and strategy = "autoMerge"', async () => {
    const svc1 = new SecretManager()
      .addConnector('InMemory', new InMemoryConnector({ KEY1: 'one' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-secret' }))
      .addSecret({ name: 'KEY1' })
      .build();

    const svc2 = new SecretManager()
      .addConnector('InMemory', new InMemoryConnector({ KEY2: 'two' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-secret' }))
      .addSecret({ name: 'KEY2' })
      .build();

    const secretRegistry = new SecretRegistry().add('svc1', svc1).add('svc2', svc2);

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: { app: { getSecretManagers: () => ({ svc1, svc2 }) } as any },
        secret: {
          registry: secretRegistry,
          conflict: { strategies: { crossManager: 'autoMerge' } },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(effects[0].value.rawData).toEqual({ KEY1: 'one', KEY2: 'two' });
  });
});


describe('SecretsOrchestrator cross-stack using single SecretManager (Integration)', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('should not conflict when multiple stacks share the same SecretManager', async () => {
    const sharedManager = new SecretManager()
      .addConnector('InMemoryLoader', new InMemoryConnector({
        API_KEY: 'abc123',
        DB_PASSWORD: 'secretpw',
      }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'app-secret' }))
      .setDefaultProvider('InMemoryProvider')
      .addSecret({ name: 'API_KEY', provider: 'InMemoryProvider' })
      .addSecret({ name: 'DB_PASSWORD', provider: 'InMemoryProvider' })
      .build();

    const stacks = {
      frontend: {
        getSecretManagers: () => ({
          default: sharedManager,
        }),
      },
      backend: {
        getSecretManagers: () => ({
          default: sharedManager,
        }),
      },
    };

    const options = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secret: {
          manager: sharedManager,
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);

    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1);
    expect(effects[0].providerName).toBe('InMemoryProvider');
    expect(effects[0].value.rawData).toEqual({
      API_KEY: 'abc123',
      DB_PASSWORD: 'secretpw',
    });

    // Should not log any conflict or error
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});

describe('SecretsOrchestrator strictConflictMode (Negative Test)', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('should throw if strictConflictMode=true but conflict strategies are relaxed', async () => {
    const sharedManager = new SecretManager()
      .addConnector('InMemoryLoader', new InMemoryConnector({
        API_KEY: 'abc123',
        DB_PASSWORD: 'secretpw',
      }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'app-secret' }))
      .setDefaultProvider('InMemoryProvider')
      .addSecret({ name: 'API_KEY', provider: 'InMemoryProvider' })
      .addSecret({ name: 'DB_PASSWORD', provider: 'InMemoryProvider' })
      .build();

    const stacks = {
      frontend: {
        getSecretManagers: () => ({
          default: sharedManager,
        }),
      },
      backend: {
        getSecretManagers: () => ({
          default: sharedManager,
        }),
      },
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger as any,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secret: {
          manager: sharedManager,
          conflict: {
            strict: true,
            strategies: {
              intraProvider: 'autoMerge', // ❌ should be error when strictConflictMode = true
            },
          }
        },
      },
    }

    const orchestrator = SecretsOrchestrator.create(options);

    // 💥 Expect an error thrown during validation, not apply phase
    await expect(orchestrator.apply()).rejects.toThrowError(
      /\[config:strictConflictMode\]/
    );
  });
});


describe('SecretsOrchestrator Cross-Manager Conflict Detection', () => {

  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('should detect conflict between different managers when strategy is error (needs managerName in conflictKey)', async () => {
    const svc1 = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ KEY: 'one' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-secret' }))
      .addSecret({ name: 'KEY' })
      .build();

    const svc2 = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ KEY: 'two' }))
      .addProvider('InMemoryProvider', new InMemoryProvider({ name: 'shared-secret' }))
      .addSecret({ name: 'KEY' })
      .build();

    const stacks = {
      app: {
        getSecretManagers: () => ({
          svc1,
          svc2,
        }),
      },
    };

    const secretRegistry = new SecretRegistry()
      .add('svc1', svc1)
      .add('svc2', svc2);

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger as any,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secret: {
          registry: secretRegistry,
          conflict: {
            strategies: {
              crossManager: 'error', // ❗ สำคัญ
            },
          },
        },
      },
    };

    const orchestrator = SecretsOrchestrator.create(options);

    await expect(orchestrator.apply()).rejects.toThrowError(
      /\[conflict:error:crossManager] Duplicate resource identifier/
    );
  });

});

describe('SecretsOrchestrator - Multiple SecretManagers with Same Provider Name', () => {

  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('should apply secrets correctly without conflict', async () => {
    // Arrange - Setup SecretManagers and Registry manually
    const frontendSecretManager = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ frontend_app_key: 'value1' }))
      .addProvider(
        'OpaqueSecretProvider',
        new InMemoryProvider({ name: 'secret-frontend' })
      )
      .addSecret({
        name: 'frontend_app_key',
      });

    const backendSecretManager = new SecretManager()
      .addConnector('InMemoryConnector', new InMemoryConnector({ backend_app_key: 'value2' }))
      .addProvider(
        'OpaqueSecretProvider',
        new InMemoryProvider({ name: 'secret-backend' })
      )
      .addSecret({
        name: 'backend_app_key',
      });

    const secretRegistry = new SecretRegistry()
      .add('frontend', frontendSecretManager)
      .add('backend', backendSecretManager);

    const orchestrator = SecretsOrchestrator.create({
      effectOptions: {},
      config: {
        secret: {
          registry: secretRegistry,
        },
        stacks: {},
      },
      logger: mockLogger as any, // or mock logger if you want
    });

    // Act
    const effects = await orchestrator.apply();

    // Assert
    expect(effects).toHaveLength(2);

    const metadata = effects.map(effect => {
      return effect.value;
    });

    expect(metadata).toStrictEqual([
      {
        "rawData": {
          "frontend_app_key": "value1",
        },
        "storeName": "secret-frontend",
      },
      {
        "rawData": {
          "backend_app_key": "value2",
        },
        "storeName": "secret-backend",
      }
    ]);
  });
});