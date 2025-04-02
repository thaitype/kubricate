/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseStack } from './BaseStack.js';
import { ResourceComposer } from './ResourceComposer.js';
import { SecretManager } from './secrets/SecretManager.js';

// Mock SecretManager
class FakeProvider {
  getInjectionPayload = vi.fn(() => 'injectedValue');
  injectes = [{ resourceId: 'deployment', path: 'spec.template.spec' }];
  setInjects = vi.fn();
}

class FakeSecretManager extends SecretManager {
  logger = undefined;
  getProviders() {
    return {
      provider1: new FakeProvider(),
      provider2: new FakeProvider(),
    } as any;
  }
  getLoaders() {
    return {};
  }
}

// Fake composer for test
class FakeComposer extends ResourceComposer {
  inject = vi.fn();
  build = vi.fn(() => ['built-resource']);
  override = vi.fn();
}

// Test Stack subclass
class TestStack extends BaseStack<() => FakeComposer, FakeSecretManager> {
  from(): this {
    this.setComposer(new FakeComposer());
    return this;
  }
}

describe('BaseStack', () => {
  let stack: TestStack;

  beforeEach(() => {
    stack = new TestStack();
  });

  it('throws if secret manager is not provided', () => {
    expect(() => {
      stack.useSecrets(undefined as any);
    }).toThrow('Cannot BaseStack.useSecrets, secret manager with ID default is not defined.');
  });

  it('throws if env is missing', () => {
    expect(() => {
      stack.useSecrets(new FakeSecretManager(), {});
    }).toThrow('Cannot BaseStack.useSecrets, secret manager with ID default requires env options.');
  });

  it('registers secret manager with injects', () => {
    const manager = new FakeSecretManager();
    stack.useSecrets(manager, {
      env: [{ name: 'FOO' }],
      injectes: [{ resourceId: 'deployment', path: 'spec.template.spec' }],
    });

    expect(stack.getSecretManager()).toBe(manager);
    expect(stack.getSecretManagers()).toHaveProperty('default');
  });

  it('setTargetInjects calls provider.setInjects', () => {
    // ✅ Create a single shared instance to spy on
    const mockProvider = {
      injectes: [],
      setInjects: vi.fn(),
      getInjectionPayload: vi.fn(() => ({})),
    };

    // ✅ FakeSecretManager returns the same tracked provider
    const manager = new (class extends FakeSecretManager {
      override getProviders() {
        return { mock: mockProvider };
      }
    })();

    const injectes = [{ resourceId: 'foo', path: 'metadata.labels' }];
    stack.useSecrets(manager as any, { env: [{ name: 'FOO' }], injectes });

    stack.setTargetInjects('default');

    // ✅ Assert the spy was called correctly
    expect(mockProvider.setInjects).toHaveBeenCalledWith(injectes);
  });

  it('build injects secrets and returns composed resources', () => {
    const manager = new FakeSecretManager();
    const injectes = [{ resourceId: 'deployment', path: 'spec.template.spec' }];

    stack.useSecrets(manager, { env: [{ name: 'FOO' }], injectes });
    stack.from(); // Set fake composer

    const result = stack.build();

    // Check inject was called for each inject
    expect(stack.getComposer().inject).toHaveBeenCalledWith('deployment', 'spec.template.spec', 'injectedValue');

    // Check build returns correct resource
    expect(result).toEqual(['built-resource']);
  });

  it('getSecretManager throws if not found', () => {
    expect(() => stack.getSecretManager('unknown')).toThrow(
      "Secret manager with ID unknown is not defined. Make sure to use the 'useSecrets' method to define it, and call before 'from' method in the stack."
    );
  });
});
