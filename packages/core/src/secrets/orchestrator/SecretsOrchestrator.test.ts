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
