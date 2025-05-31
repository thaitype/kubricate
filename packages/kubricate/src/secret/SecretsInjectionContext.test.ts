/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SecretInjectionBuilder } from './SecretInjectionBuilder.js';
import { SecretsInjectionContext } from './SecretsInjectionContext.js';

describe('SecretsInjectionContext', () => {
  let mockStack: any;
  let mockManager: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let builderInstance: SecretInjectionBuilder;

  beforeEach(() => {
    mockStack = {
      registerSecretInjection: vi.fn(),
      getComposer: vi.fn().mockReturnValue({
        findResourceIdsByKind: () => ['my-deployment'],
      }),
    };

    builderInstance = {
      resolveInjection: vi.fn(),
    } as unknown as SecretInjectionBuilder;

    mockManager = {
      resolveProviderFor: vi.fn().mockImplementation((key: string) => ({
        providerInstance: {
          supportedStrategies: ['env'],
          targetKind: 'Deployment',
          getTargetPath: vi.fn(() => ['spec.template.spec.containers[0].env']),
        },
        providerId: `provider-${key}`,
      })),
    };
  });

  it('should set the default resource ID', () => {
    const ctx = new SecretsInjectionContext(mockStack, mockManager, 99);
    ctx.setDefaultResourceId('default-deploy');

    const result = ctx.secrets('MY_SECRET');
    expect(result['ctx'].defaultResourceId).toBe('default-deploy');
  });

  it('should create a builder and push it to the list', () => {
    const ctx = new SecretsInjectionContext(mockStack, mockManager, 99);
    const builder = ctx.secrets('MY_SECRET');

    expect(builder).toBeInstanceOf(SecretInjectionBuilder);

    expect(ctx['builders']).toHaveLength(1);
  });

  it('should resolve all builder injections on resolveAll()', () => {
    const ctx = new SecretsInjectionContext(mockStack, mockManager, 99);

    // Monkey patch builder manually to test call propagation
    const builder1 = {
      resolveInjection: vi.fn(),
    } as unknown as SecretInjectionBuilder;

    const builder2 = {
      resolveInjection: vi.fn(),
    } as unknown as SecretInjectionBuilder;

    ctx['builders'].push(builder1, builder2);

    ctx.resolveAll();

    expect(builder1.resolveInjection).toHaveBeenCalled();
    expect(builder2.resolveInjection).toHaveBeenCalled();
  });

  it('builder returned by .secrets() should include correct context and provider', () => {
    const ctx = new SecretsInjectionContext(mockStack, mockManager, 88);
    const builder = ctx.secrets('MY_SECRET');

    expect(builder['secretName']).toBe('MY_SECRET');
    expect(builder['ctx'].secretManagerId).toBe(88);
    expect(builder['ctx'].providerId).toBe('provider-MY_SECRET');
  });
});
