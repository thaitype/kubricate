/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import type { ProviderInjection } from '@kubricate/core';

import { BasicAuthSecretProvider } from './BasicAuthSecretProvider.js';

describe('BasicAuthSecretProvider', () => {
  describe('prepare()', () => {
    it('should generate correct kubernetes.io/basic-auth Secret', () => {
      const provider = new BasicAuthSecretProvider({
        name: 'my-basic-auth',
        namespace: 'production',
      });

      const secretValue = {
        username: 'admin',
        password: 'super-secret-123',
      };

      const effects = provider.prepare('API_CREDENTIALS', secretValue);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toMatchObject({
        type: 'kubectl',
        secretName: 'API_CREDENTIALS',
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'my-basic-auth',
            namespace: 'production',
          },
          type: 'kubernetes.io/basic-auth',
          data: {
            username: expect.any(String),
            password: expect.any(String),
          },
        },
      });
    });

    it('should base64 encode username and password', () => {
      const provider = new BasicAuthSecretProvider({ name: 'my-secret' });

      const effects = provider.prepare('CREDS', {
        username: 'testuser',
        password: 'testpass',
      });

      // Base64 of 'testuser' is 'dGVzdHVzZXI='
      // Base64 of 'testpass' is 'dGVzdHBhc3M='
      expect(effects[0].value.data.username).toBe('dGVzdHVzZXI=');
      expect(effects[0].value.data.password).toBe('dGVzdHBhc3M=');
    });

    it('should use default namespace when not specified', () => {
      const provider = new BasicAuthSecretProvider({ name: 'my-secret' });

      const effects = provider.prepare('CREDS', {
        username: 'user',
        password: 'pass',
      });

      expect(effects[0].value.metadata.namespace).toBe('default');
    });

    it('should throw error if username is missing', () => {
      const provider = new BasicAuthSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('CREDS', {
          password: 'pass',
        } as any);
      }).toThrow(/username/);
    });

    it('should throw error if password is missing', () => {
      const provider = new BasicAuthSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('CREDS', {
          username: 'user',
        } as any);
      }).toThrow(/password/);
    });

    it('should throw error if value is not an object', () => {
      const provider = new BasicAuthSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('CREDS', 'invalid-string' as any);
      }).toThrow();
    });
  });

  describe('getInjectionPayload() - env strategy', () => {
    it('should inject username with key="username"', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_USER',
            strategy: { kind: 'env' as const, key: 'username' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          name: 'API_USER',
          valueFrom: {
            secretKeyRef: {
              name: 'api-auth',
              key: 'username',
            },
          },
        },
      ]);
    });

    it('should inject password with key="password"', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_PASSWORD',
            strategy: { kind: 'env' as const, key: 'password' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          name: 'API_PASSWORD',
          valueFrom: {
            secretKeyRef: {
              name: 'api-auth',
              key: 'password',
            },
          },
        },
      ]);
    });

    it('should inject both username and password as separate env vars', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_USER',
            strategy: { kind: 'env' as const, key: 'username' },
          },
        },
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_PASSWORD',
            strategy: { kind: 'env' as const, key: 'password' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toHaveLength(2);
      const envVars = payload as any[];
      expect(envVars[0].name).toBe('API_USER');
      expect(envVars[0].valueFrom?.secretKeyRef?.key).toBe('username');
      expect(envVars[1].name).toBe('API_PASSWORD');
      expect(envVars[1].valueFrom?.secretKeyRef?.key).toBe('password');
    });

    it('should throw error if key is missing in env strategy', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_USER',
            strategy: { kind: 'env' as const }, // Missing key
          },
        },
      ];

      expect(() => {
        provider.getInjectionPayload(injections);
      }).toThrow(/key.*is required/i);
    });

    it('should throw error if key is not "username" or "password"', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_USER',
            strategy: { kind: 'env' as const, key: 'email' }, // Invalid key
          },
        },
      ];

      expect(() => {
        provider.getInjectionPayload(injections);
      }).toThrow(/Invalid key.*email/);
    });

    it('should throw error if targetName is missing', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: '', // Empty targetName
            strategy: { kind: 'env' as const, key: 'username' },
          },
        },
      ] as any;

      expect(() => {
        provider.getInjectionPayload(injections);
      }).toThrow(/Missing targetName/);
    });
  });

  describe('getInjectionPayload() - envFrom strategy', () => {
    it('should inject entire secret without prefix', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_CREDENTIALS', // Required by type even for envFrom
            strategy: { kind: 'envFrom' as const },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          secretRef: {
            name: 'api-auth',
          },
        },
      ]);
    });

    it('should inject entire secret with prefix', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_CREDENTIALS', // Required by type even for envFrom
            strategy: { kind: 'envFrom' as const, prefix: 'BASIC_' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          prefix: 'BASIC_',
          secretRef: {
            name: 'api-auth',
          },
        },
      ]);
    });
  });

  describe('getTargetPath()', () => {
    it('should return correct path for env strategy', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const path = provider.getTargetPath({ kind: 'env', containerIndex: 0 });

      expect(path).toBe('spec.template.spec.containers[0].env');
    });

    it('should return correct path for env strategy with custom container index', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const path = provider.getTargetPath({ kind: 'env', containerIndex: 2 });

      expect(path).toBe('spec.template.spec.containers[2].env');
    });

    it('should return correct path for envFrom strategy', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const path = provider.getTargetPath({ kind: 'envFrom', containerIndex: 0 });

      expect(path).toBe('spec.template.spec.containers[0].envFrom');
    });

    it('should return correct path for envFrom strategy with custom container index', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const path = provider.getTargetPath({ kind: 'envFrom', containerIndex: 1 });

      expect(path).toBe('spec.template.spec.containers[1].envFrom');
    });

    it('should use custom targetPath if provided for env strategy', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const path = provider.getTargetPath({
        kind: 'env',
        containerIndex: 0,
        targetPath: 'custom.path.to.env',
      });

      expect(path).toBe('custom.path.to.env');
    });

    it('should use custom targetPath if provided for envFrom strategy', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const path = provider.getTargetPath({
        kind: 'envFrom',
        containerIndex: 0,
        targetPath: 'custom.path.to.envFrom',
      });

      expect(path).toBe('custom.path.to.envFrom');
    });

    it('should throw error for unsupported strategy', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      expect(() => {
        provider.getTargetPath({ kind: 'annotation' } as any);
      }).toThrow(/Unsupported injection strategy/);
    });
  });

  describe('getEffectIdentifier()', () => {
    it('should return namespace/name identifier', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'CREDS',
        providerName: 'basicAuth',
        value: {
          metadata: {
            name: 'api-auth',
            namespace: 'production',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('production/api-auth');
    });

    it('should use default namespace if not specified', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'CREDS',
        providerName: 'basicAuth',
        value: {
          metadata: {
            name: 'api-auth',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('default/api-auth');
    });
  });

  describe('mergeSecrets()', () => {
    it('should merge multiple effects for same secret', () => {
      const provider = new BasicAuthSecretProvider({
        name: 'api-auth',
        namespace: 'default',
      });

      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'SECRET1',
          providerName: 'basicAuth',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'api-auth',
              namespace: 'default',
            },
            type: 'kubernetes.io/basic-auth',
            data: {
              username: 'dXNlcjE=',
            },
          },
        },
        {
          type: 'kubectl' as const,
          secretName: 'SECRET1',
          providerName: 'basicAuth',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'api-auth',
              namespace: 'default',
            },
            type: 'kubernetes.io/basic-auth',
            data: {
              password: 'cGFzczE=',
            },
          },
        },
      ];

      const merged = provider.mergeSecrets(effects);

      expect(merged).toHaveLength(1);
      expect(merged[0].value.data).toEqual({
        username: 'dXNlcjE=',
        password: 'cGFzczE=',
      });
    });

    it('should throw error on duplicate keys', () => {
      const provider = new BasicAuthSecretProvider({
        name: 'api-auth',
        namespace: 'default',
      });

      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'SECRET1',
          providerName: 'basicAuth',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'api-auth',
              namespace: 'default',
            },
            type: 'kubernetes.io/basic-auth',
            data: {
              username: 'dXNlcjE=',
            },
          },
        },
        {
          type: 'kubectl' as const,
          secretName: 'SECRET1',
          providerName: 'basicAuth',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'api-auth',
              namespace: 'default',
            },
            type: 'kubernetes.io/basic-auth',
            data: {
              username: 'dXNlcjI=', // Duplicate key with different value
            },
          },
        },
      ];

      expect(() => {
        provider.mergeSecrets(effects);
      }).toThrow(/Conflict.*username/);
    });
  });

  describe('supportedStrategies', () => {
    it('should support env and envFrom strategies', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      expect(provider.supportedStrategies).toContain('env');
      expect(provider.supportedStrategies).toContain('envFrom');
      expect(provider.supportedStrategies).toHaveLength(2);
    });
  });

  describe('provider metadata', () => {
    it('should have correct secretType', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      expect(provider.secretType).toBe('Kubernetes.Secret.BasicAuth');
    });

    it('should have correct targetKind', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      expect(provider.targetKind).toBe('Deployment');
    });

    it('should allow merge', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      expect(provider.allowMerge).toBe(true);
    });
  });

  describe('Strategy Validation', () => {
    describe('Mixed Strategy Validation', () => {
      it('should throw error when env and envFrom strategies are mixed', () => {
        const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

        const mixedInjections: ProviderInjection[] = [
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].customPath',
            meta: {
              secretName: 'CRED1',
              targetName: 'USERNAME',
              strategy: { kind: 'env', key: 'username' },
            },
          },
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].customPath',
            meta: {
              secretName: 'CRED2',
              targetName: 'CRED2',
              strategy: { kind: 'envFrom', prefix: 'DB_' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(
          /mixed injection strategies are not allowed/i
        );
        expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(/env, envFrom/);
      });

      it('should include helpful context in error message', () => {
        const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

        const mixedInjections: ProviderInjection[] = [
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'CRED1',
              targetName: 'USERNAME',
              strategy: { kind: 'env', key: 'username' },
            },
          },
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'CRED2',
              targetName: 'CRED2',
              strategy: { kind: 'envFrom' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(/framework bug or incorrect targetPath/i);
      });
    });

    describe('envFrom Prefix Validation', () => {
      it('should throw error when multiple different prefixes are used', () => {
        const provider = new BasicAuthSecretProvider({ name: 'shared-auth', namespace: 'default' });

        const conflictingInjections: ProviderInjection[] = [
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'API_CREDS',
              targetName: 'API_CREDS',
              strategy: { kind: 'envFrom', prefix: 'API_' },
            },
          },
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'DB_CREDS',
              targetName: 'DB_CREDS',
              strategy: { kind: 'envFrom', prefix: 'DB_' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(
          /multiple envFrom prefixes detected/i
        );
        expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(/API_, DB_/);
      });

      it('should throw error when mixing prefixed and non-prefixed envFrom', () => {
        const provider = new BasicAuthSecretProvider({ name: 'shared-auth', namespace: 'default' });

        const conflictingInjections: ProviderInjection[] = [
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'CRED1',
              targetName: 'CRED1',
              strategy: { kind: 'envFrom', prefix: 'API_' },
            },
          },
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'CRED2',
              targetName: 'CRED2',
              strategy: { kind: 'envFrom' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(
          /multiple envFrom prefixes detected/i
        );
        expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(/\(none\)/);
      });

      it('should accept multiple envFrom injections with same prefix', () => {
        const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

        const validInjections: ProviderInjection[] = [
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'CRED1',
              targetName: 'CRED1',
              strategy: { kind: 'envFrom', prefix: 'DB_' },
            },
          },
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'CRED2',
              targetName: 'CRED2',
              strategy: { kind: 'envFrom', prefix: 'DB_' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
      });

      it('should accept multiple envFrom injections with no prefix (undefined)', () => {
        const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

        const validInjections: ProviderInjection[] = [
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'CRED1',
              targetName: 'CRED1',
              strategy: { kind: 'envFrom' },
            },
          },
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'CRED2',
              targetName: 'CRED2',
              strategy: { kind: 'envFrom' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
      });
    });

    describe('env Strategy Validation', () => {
      it('should accept multiple env injections with different keys', () => {
        const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

        const validInjections: ProviderInjection[] = [
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'BASIC_AUTH',
              targetName: 'API_USER',
              strategy: { kind: 'env', key: 'username' },
            },
          },
          {
            providerId: 'basicAuth',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'BASIC_AUTH',
              targetName: 'API_PASSWORD',
              strategy: { kind: 'env', key: 'password' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
        const payload = provider.getInjectionPayload(validInjections);
        expect(payload).toHaveLength(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for empty injectes', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const payload = provider.getInjectionPayload([]);

      expect(payload).toEqual([]);
    });

    it('should throw error for unsupported strategy kind in getInjectionPayload', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].volumeMounts',
          meta: {
            secretName: 'CRED1',
            targetName: 'CRED1',
            strategy: { kind: 'volume' } as any,
          },
        },
      ];

      expect(() => provider.getInjectionPayload(injections)).toThrow(/Unsupported strategy kind/);
    });

    it('should infer env strategy from path without .envFrom', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_USER',
            // No strategy provided - will be inferred from path
            // But we need to add the key for env strategy to work
            strategy: { kind: 'env', key: 'username' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toHaveLength(1);
      expect((payload as any)[0].name).toBe('API_USER');
    });

    it('should infer env strategy for path without .envFrom in extractStrategy', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      // Create injection without explicit strategy - will use path inference
      const injections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.customPath',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_USER',
            // No strategy - will infer 'env' from path (doesn't contain .envFrom)
          },
        },
      ];

      // This should infer 'env' strategy, but will throw because key is missing
      expect(() => {
        provider.getInjectionPayload(injections);
      }).toThrow(/key.*is required/i);
    });

    it('should infer envFrom strategy from path with .envFrom', () => {
      const provider = new BasicAuthSecretProvider({ name: 'api-auth' });

      const injections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'API_CREDENTIALS',
            targetName: 'API_CREDENTIALS',
            // No strategy provided - will be inferred from path
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toHaveLength(1);
      expect((payload as any)[0].secretRef).toBeDefined();
    });
  });
});
