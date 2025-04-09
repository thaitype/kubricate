/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecretsOrchestrator } from './SecretsOrchestrator.js';
import type { SecretsOrchestratorOptions } from './types.js';
import type { SecretManager } from '../SecretManager.js';
import type { PreparedEffect } from '../providers/BaseProvider.js';

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

  it('warns on stackLevel conflict when strategy is "warn"', async () => {
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          a: mockSecretManager('a', { SHARED: { loader: 'env', provider: 'kubernetes', value: 'one' } }),
          b: mockSecretManager('b', { SHARED: { loader: 'env', provider: 'kubernetes', value: 'two' } }),
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          kubernetes: {
            merge: {
              providerLevel: 'autoMerge',
              managerLevel: 'autoMerge',
              stackLevel: 'warn',
              workspaceLevel: 'autoMerge',
            }
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();
    const keys = effects.flatMap(e => Object.keys(e.value.data));
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys).toEqual(new Set(['SHARED']));
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[merge:warn:stackLevel]'));
  });

  it('skips on managerLevel conflict when strategy is "skip"', async () => {
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          a: mockSecretManager('a', { SHARED: { loader: 'env', provider: 'kubernetes', value: 'A1' } }),
        })
      },
      stack2: {
        getSecretManagers: () => ({
          a: mockSecretManager('a', { SHARED: { loader: 'env', provider: 'kubernetes', value: 'A2' } }),
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          kubernetes: {
            merge: {
              providerLevel: 'skip',
              managerLevel: 'skip',
              stackLevel: 'skip',
              workspaceLevel: 'skip',
            }
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();
    const keys = effects.flatMap(e => Object.keys(e.value.data));
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys).toEqual(new Set(['SHARED'])); // only one version of SHARED should survive
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
          kubernetes: {
            merge: {
              providerLevel: 'autoMerge',
              managerLevel: 'autoMerge',
              stackLevel: 'autoMerge',
              workspaceLevel: 'autoMerge',
            }
          }
        }
      }
    };
  
    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();
  
    expect(effects).toMatchSnapshot();
  });
  
  it('snapshots merge metadata and conflict trace with warn strategy', async () => {
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
          kubernetes: {
            merge: {
              providerLevel: 'autoMerge',
              managerLevel: 'warn',
              stackLevel: 'warn',
              workspaceLevel: 'warn',
            }
          }
        }
      }
    };
  
    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();
  
    // Snapshot actual effects
    expect(effects).toMatchSnapshot();
  
    // Snapshot logged conflict resolution
    const logs = mockLogger.warn.mock.calls.map((c: any[]) => c[0]);
    expect(logs).toMatchSnapshot();
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


  it('skips on managerLevel conflict when strategy is "skip"', async () => {
    const stacks = {
      stack1: {
        getSecretManagers: () => ({
          a: mockSecretManager('a', { SHARED: { loader: 'env', provider: 'kubernetes', value: 'A1' } }),
        })
      },
      stack2: {
        getSecretManagers: () => ({
          a: mockSecretManager('a', { SHARED: { loader: 'env', provider: 'kubernetes', value: 'A2' } }),
        })
      }
    };

    const options: SecretsOrchestratorOptions = {
      logger: mockLogger,
      effectOptions: {},
      config: {
        stacks: stacks as any,
        secrets: {
          kubernetes: {
            merge: {
              providerLevel: 'skip',
              managerLevel: 'skip',
              stackLevel: 'skip',
              workspaceLevel: 'skip',
            }
          }
        }
      }
    };

    orchestrator = SecretsOrchestrator.create(options);
    const effects = await orchestrator.apply();
    const keys = effects.flatMap(e => Object.keys(e.value.data));
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys).toEqual(new Set(['SHARED'])); // only one version of SHARED should survive
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
          kubernetes: {
            merge: {
              providerLevel: 'autoMerge',
              managerLevel: 'autoMerge',
              stackLevel: 'autoMerge',
              workspaceLevel: 'autoMerge',
            }
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
