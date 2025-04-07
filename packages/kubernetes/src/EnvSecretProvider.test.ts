import { describe, it, expect } from 'vitest';
import { EnvSecretProvider } from './EnvSecretProvider.js';

describe('EnvSecretProvider', () => {
  const provider = new EnvSecretProvider({ name: 'my-secret' });

  it('should throw error if secrets are not set before getInjectionPayload', () => {
    expect(() => provider.getInjectionPayload()).toThrow('Secrets not set in EnvSecretProvider');
  });

  it('should generate correct injection payload', () => {
    provider.setSecrets({
      MY_SECRET: {
        name: 'MY_SECRET',
      }
    });

    provider.setInjects([
      {
        resourceId: 'deployment',
        path: 'spec.template.spec.containers[0].env',
        meta: {
          secretName: 'MY_SECRET',
          targetName: 'API_KEY',
        },
        provider
      }
    ]);

    const payload = provider.getInjectionPayload();
    expect(payload).toEqual([
      {
        name: 'API_KEY',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'MY_SECRET',
          }
        }
      }
    ]);
  });

  it('should throw if injection metadata is missing', () => {
    provider.setSecrets({
      MY_SECRET: {
        name: 'MY_SECRET',
      }
    });

    provider.setInjects([
      {
        resourceId: 'deployment',
        path: 'spec.template.spec.containers[0].env',
        provider
      }
    ]);

    expect(() => provider.getInjectionPayload()).toThrow('Invalid injection metadata for EnvSecretProvider');
  });

  it('should generate correct kubectl effect', () => {
    const effects = provider.prepare('MY_SECRET', 'super-secret');
    expect(effects[0].type).toBe('kubectl');
    expect(effects[0].value.metadata.name).toBe('my-secret');
    expect(effects[0].value.data['MY_SECRET']).toBe('c3VwZXItc2VjcmV0'); // base64 of "super-secret"
  });
});
