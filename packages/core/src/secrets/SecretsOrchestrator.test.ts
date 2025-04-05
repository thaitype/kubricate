/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecretsOrchestrator } from './SecretsOrchestrator.js';

// 👇 Mock orchestration functions
vi.mock('./manager.js', () => ({
  collectSecretManagers: vi.fn(),
  validateSecretManagers: vi.fn(),
  prepareSecretEffects: vi.fn(),
}));

import { collectSecretManagers, validateSecretManagers, prepareSecretEffects } from './manager.js';
import type { SecretOptions } from './SecretManager.js';

describe('SecretsOrchestrator', () => {
  let mockLogger: any;
  let orchestrator: SecretsOrchestrator;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
    };

    orchestrator = new SecretsOrchestrator({ stacks: {} } as any, mockLogger);
  });

  it('calls collect and validate secret managers', async () => {
    (collectSecretManagers as any).mockReturnValue({});
    await orchestrator.validate();

    expect(collectSecretManagers).toHaveBeenCalled();
    expect(validateSecretManagers).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('Validating secret managers...');
  });

  it('calls prepare secret effects', async () => {
    const fakeEffects = [{ type: 'manual', value: 'something' }];
    (collectSecretManagers as any).mockReturnValue({});
    (prepareSecretEffects as any).mockResolvedValue(fakeEffects);

    const result = await orchestrator.prepare();
    expect(result).toEqual(fakeEffects);
    expect(mockLogger.debug).toHaveBeenCalledWith('Preparing secret effects...');
  });

  it('injects secrets into providers correctly', () => {
    const mockSetSecrets = vi.fn();
    const mockSecretManager = {
      getSecrets: () => ({
        foo: { provider: 'k8s' },
        bar: { provider: 'k8s' },
      }),
      getProviders: () => ({
        k8s: { setSecrets: mockSetSecrets },
      }),
      getDefaultProvider: () => 'k8s',
    };

    (collectSecretManagers as any).mockReturnValue({
      'my-stack.default': {
        name: 'default',
        stackName: 'my-stack',
        secretManager: mockSecretManager,
      },
    });

    orchestrator.injectSecretsToProviders();

    expect(mockLogger.debug).toHaveBeenCalledWith('Injecting secrets for 1 secret managers');
    expect(mockSetSecrets).toHaveBeenCalledWith({
      foo: { provider: 'k8s' },
      bar: { provider: 'k8s' },
    });
  });

  it('filters secrets correctly by provider', () => {
    const secrets: Record<string, SecretOptions> = {
      db: { name: 'db', provider: 'k8s' },
      token: { name: 'token', provider: 'vault' },
      noProvider: { name: 'noProvider' },
    };

    const mockSecretManager = {
      getDefaultProvider: () => 'k8s',
    };

    const filtered = (orchestrator as any).filterSecretsByProvider(secrets, 'k8s', mockSecretManager);

    expect(filtered).toEqual({
      db: { name: 'db', provider: 'k8s' },
      noProvider: { name: 'noProvider' },
    });
  });
});
