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

describe('SecretsOrchestrator', () => {
  let mockLogger: any;
  let orchestrator: SecretsOrchestrator;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
    };

    orchestrator = new SecretsOrchestrator({ stacks: {} } as any, {}, mockLogger);
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

});
