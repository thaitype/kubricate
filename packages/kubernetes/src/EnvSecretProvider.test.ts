import { describe, it, expect } from 'vitest';
import { EnvSecretProvider } from './EnvSecretProvider.js';

describe('EnvSecretProvider', () => {
  it('should generate correct injection payload', () => {
    const provider = new EnvSecretProvider({ name: 'my-secret' });

    provider.setInjects([
      {
        provider,
        resourceId: 'my-app',
        path: 'spec.template.spec.containers[0].env',
        meta: {
          secretName: 'MY_SECRET',
          targetName: 'MY_SECRET_ENV',
        },
      },
    ]);

    const payload = provider.getInjectionPayload();
    expect(payload).toEqual([
      {
        name: 'MY_SECRET_ENV',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'MY_SECRET',
          },
        },
      },
    ]);
  });

  it('should throw if meta is missing', () => {
    const provider = new EnvSecretProvider({ name: 'my-secret' });

    provider.setInjects([
      {
        provider,
        resourceId: 'my-app',
        path: 'spec.template.spec.containers[0].env',
        meta: undefined,
      },
    ]);

    expect(() => provider.getInjectionPayload()).toThrowError(
      'Invalid injection metadata for EnvSecretProvider'
    );
  });

  it('should create correct kubectl effect in prepare()', () => {
    const provider = new EnvSecretProvider({ name: 'my-secret', namespace: 'custom-ns' });

    const effects = provider.prepare('API_KEY', 'super-secret-value');
    expect(effects[0]).toMatchObject({
      type: 'kubectl',
      value: {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'my-secret',
          namespace: 'custom-ns',
        },
        type: 'Opaque',
        data: {
          API_KEY: expect.any(String),
        },
      },
    });
  });
});