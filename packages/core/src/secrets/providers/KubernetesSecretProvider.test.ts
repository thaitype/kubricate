/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { KubernetesSecretProvider } from './KubernetesSecretProvider.js';
import type { SecretOptions } from '../SecretManager.js';

describe('KubernetesSecretProvider', () => {
  const provider = new KubernetesSecretProvider({ name: 'my-secret', namespace: 'myns' });

  it('should store secrets via setSecrets', () => {
    const secrets: Record<string, SecretOptions> = {
      FOO: { name: 'FOO', provider: 'k8s' },
    };

    provider.setSecrets(secrets);
    expect(provider.secrets).toEqual(secrets);
  });
  
  it('should generate EnvVar[] via getInjectionPayload', () => {
    provider.setSecrets({
      MY_ENV: { name: 'MY_ENV', provider: 'k8s' },
    });

    const payload = provider.getInjectionPayload();
    expect(payload).toEqual([
      {
        name: 'MY_ENV',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'MY_ENV',
          },
        },
      },
    ]);
  });

  it('should warn if secrets is empty in getInjectionPayload', () => {
    const spyWarn = vi.fn();
    provider.logger = { warn: spyWarn } as any;

    provider.setSecrets({});
    const result = provider.getInjectionPayload();
    expect(spyWarn).toHaveBeenCalledWith('Trying to get secrets from KubernetesSecretProvider, but no secrets set');
    expect(result).toEqual([]);
  });

  it('should throw if getInjectionPayload is called before setSecrets', () => {
    const uninitProvider = new KubernetesSecretProvider({ name: 'unset' });
    expect(() => uninitProvider.getInjectionPayload()).toThrow('Secrets not set in KubernetesSecretProvider');
  });

  it('should return kubectl effect with base64 encoded value in prepare', () => {
    const result = provider.prepare('MY_SECRET', 'supersecret');

    expect(result).toEqual([
      {
        type: 'kubectl',
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'my-secret',
            namespace: 'myns',
          },
          type: 'Opaque',
          data: {
            MY_SECRET: 'c3VwZXJzZWNyZXQ=', // Base64 of 'supersecret'
          },
        },
      },
    ]);
  });
});
