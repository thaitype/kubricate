/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import { OpaqueSecretProvider } from './OpaqueSecretProvider.js';

describe('OpaqueSecretProvider', () => {
  describe('prepare()', () => {
    it('should create correct kubectl effect in prepare()', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret', namespace: 'custom-ns' });

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

    it('should use default namespace when not specified', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      const effects = provider.prepare('KEY', 'value');

      expect(effects[0].value.metadata.namespace).toBe('default');
    });
  });

  describe('getTargetPath()', () => {
    it('should return correct path for env strategy with default container index', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      const path = provider.getTargetPath({ kind: 'env' });

      expect(path).toBe('spec.template.spec.containers[0].env');
    });

    it('should return correct path for env strategy with custom container index', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      const path = provider.getTargetPath({ kind: 'env', containerIndex: 2 });

      expect(path).toBe('spec.template.spec.containers[2].env');
    });

    it('should use custom targetPath if provided', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      const path = provider.getTargetPath({
        kind: 'env',
        targetPath: 'custom.path.to.env',
      });

      expect(path).toBe('custom.path.to.env');
    });

    it('should throw error for unsupported strategy', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.getTargetPath({ kind: 'imagePullSecret' } as any);
      }).toThrow(/Unsupported injection strategy/);
    });
  });

  describe('getInjectionPayload()', () => {
    it('should return env vars with correct structure', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      const injections = [
        {
          providerId: 'opaque',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_KEY',
            targetName: 'MY_API_KEY',
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          name: 'MY_API_KEY',
          valueFrom: {
            secretKeyRef: {
              name: 'my-secret',
              key: 'API_KEY',
            },
          },
        },
      ]);
    });

    it('should use secretName as targetName if targetName is not provided', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      const injections = [
        {
          providerId: 'opaque',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'DATABASE_URL',
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections as any);

      expect(payload[0].name).toBe('DATABASE_URL');
    });

    it('should throw error if both name and key are missing', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      const injections = [
        {
          providerId: 'opaque',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {},
        },
      ];

      expect(() => {
        provider.getInjectionPayload(injections as any);
      }).toThrow(/Invalid injection metadata/);
    });
  });

  describe('getEffectIdentifier()', () => {
    it('should return namespace/name identifier', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'API_KEY',
        providerName: 'opaque',
        value: {
          metadata: {
            name: 'my-secret',
            namespace: 'production',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('production/my-secret');
    });

    it('should use default namespace if not specified', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'API_KEY',
        providerName: 'opaque',
        value: {
          metadata: {
            name: 'my-secret',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('default/my-secret');
    });
  });

  describe('mergeSecrets()', () => {
    it('should merge multiple effects for same secret', () => {
      const provider = new OpaqueSecretProvider({
        name: 'my-secret',
        namespace: 'default',
      });

      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'KEY1',
          providerName: 'opaque',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'my-secret',
              namespace: 'default',
            },
            type: 'Opaque',
            data: {
              KEY1: 'dmFsdWUx',
            },
          },
        },
        {
          type: 'kubectl' as const,
          secretName: 'KEY2',
          providerName: 'opaque',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'my-secret',
              namespace: 'default',
            },
            type: 'Opaque',
            data: {
              KEY2: 'dmFsdWUy',
            },
          },
        },
      ];

      const merged = provider.mergeSecrets(effects);

      expect(merged).toHaveLength(1);
      expect(merged[0].value.data).toEqual({
        KEY1: 'dmFsdWUx',
        KEY2: 'dmFsdWUy',
      });
    });
  });

  describe('provider metadata', () => {
    it('should have correct secretType', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      expect(provider.secretType).toBe('Kubernetes.Secret.Opaque');
    });

    it('should have correct targetKind', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      expect(provider.targetKind).toBe('Deployment');
    });

    it('should support env strategy', () => {
      const provider = new OpaqueSecretProvider({ name: 'my-secret' });

      expect(provider.supportedStrategies).toContain('env');
    });
  });
});
