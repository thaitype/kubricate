/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecretInjectionBuilder } from './SecretInjectionBuilder.js';
import type { SecretInjectionStrategy } from '../BaseStack.js';
import type { BaseProvider } from './providers/BaseProvider.js';

const createMockProvider = (supportedStrategies: SecretInjectionStrategy['kind'][]): BaseProvider => ({
  supportedStrategies,
  targetKind: 'Deployment',
  getTargetPath: vi.fn((strategy: any) => [`spec.template.spec.containers[${strategy.containerIndex ?? 0}].env`]),
} as any);

const createMockStack = () => ({
  registerSecretInjection: vi.fn(),
  getComposer: vi.fn(),
});

describe('SecretInjectionBuilder', () => {
  let stack: ReturnType<typeof createMockStack>;
  let provider: BaseProvider;

  beforeEach(() => {
    stack = createMockStack();
    provider = createMockProvider(['env']);

    stack.getComposer.mockReturnValue({
      findResourceIdsByKind: () => ['my-deployment'],
    });
  });

  it('injects using default strategy when only one kind is supported', () => {
    const builder = new SecretInjectionBuilder(stack as any, 'MY_SECRET', provider, {
      secretManagerId: 1,
      providerId: 'my-provider',
    });

    builder.inject().resolveInjection();

    expect(stack.registerSecretInjection).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: {
          secretName: 'MY_SECRET',
          targetName: 'MY_SECRET',
        },
        path: ['spec.template.spec.containers[0].env'],
      })
    );
  });

  it('injects using custom kind and options', () => {
    const builder = new SecretInjectionBuilder(stack as any, 'MY_SECRET', provider, {
      secretManagerId: 1,
      providerId: 'my-provider',
    });

    builder.inject('env', { containerIndex: 1 } as any).resolveInjection();

    expect(stack.registerSecretInjection).toHaveBeenCalledWith(
      expect.objectContaining({
        path: ['spec.template.spec.containers[1].env'],
      })
    );
  });

  it('overrides target name via .forName()', () => {
    const builder = new SecretInjectionBuilder(stack as any, 'MY_SECRET', provider, {
      secretManagerId: 1,
      providerId: 'my-provider',
    });

    builder.forName('API_KEY').inject().resolveInjection();

    expect(stack.registerSecretInjection).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ targetName: 'API_KEY' }),
      })
    );
  });

  it('resolves resourceId from intoResource', () => {
    const builder = new SecretInjectionBuilder(stack as any, 'MY_SECRET', provider, {
      secretManagerId: 1,
      providerId: 'my-provider',
    });

    builder.intoResource('my-deployment').inject().resolveInjection();

    expect(stack.registerSecretInjection).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'my-deployment',
      })
    );
  });

  it('resolves resourceId from defaultResourceId', () => {
    const builder = new SecretInjectionBuilder(stack as any, 'MY_SECRET', provider, {
      secretManagerId: 1,
      providerId: 'my-provider',
      defaultResourceId: 'default-deploy',
    });

    builder.inject().resolveInjection();

    expect(stack.registerSecretInjection).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'default-deploy',
      })
    );
  });

  it('throws if inject() is called with no args and provider supports multiple kinds', () => {
    const multiKindProvider = createMockProvider(['env', 'annotation']);
    const builder = new SecretInjectionBuilder(stack as any, 'MY_SECRET', multiKindProvider, {
      secretManagerId: 1,
      providerId: 'my-provider',
    });

    expect(() => builder.inject()).toThrowError(/requires a strategy because provider supports multiple strategies/);
  });

  it('throws if no composer exists and resourceId is not set', () => {
    stack.getComposer.mockReturnValue(undefined);

    const builder = new SecretInjectionBuilder(stack as any, 'MY_SECRET', provider, {
      secretManagerId: 1,
      providerId: 'my-provider',
    });

    builder.inject();

    expect(() => builder.resolveInjection()).toThrowError(/No resource composer found/);
  });

  it('throws if multiple resource IDs found', () => {
    stack.getComposer.mockReturnValue({
      findResourceIdsByKind: () => ['res1', 'res2'],
    });

    const builder = new SecretInjectionBuilder(stack as any, 'MY_SECRET', provider, {
      secretManagerId: 1,
      providerId: 'my-provider',
    });

    builder.inject();

    expect(() => builder.resolveInjection()).toThrowError(/Multiple resourceIds found/);
  });

  it('throws if no matching resource ID found', () => {
    stack.getComposer.mockReturnValue({
      findResourceIdsByKind: () => [],
    });

    const builder = new SecretInjectionBuilder(stack as any, 'MY_SECRET', provider, {
      secretManagerId: 1,
      providerId: 'my-provider',
    });

    builder.inject();

    expect(() => builder.resolveInjection()).toThrowError(/Could not resolve resourceId/);
  });
});
