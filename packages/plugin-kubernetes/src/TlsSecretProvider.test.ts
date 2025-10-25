/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import type { ProviderInjection } from '@kubricate/core';

import { TlsSecretProvider } from './TlsSecretProvider.js';

describe('TlsSecretProvider', () => {
  describe('prepare()', () => {
    it('should generate correct kubernetes.io/tls Secret', () => {
      const provider = new TlsSecretProvider({
        name: 'my-tls',
        namespace: 'production',
      });

      const secretValue = {
        cert: '-----BEGIN CERTIFICATE-----\nMIICertData\n-----END CERTIFICATE-----',
        key: '-----BEGIN PRIVATE KEY-----\nMIIKeyData\n-----END PRIVATE KEY-----',
      };

      const effects = provider.prepare('INGRESS_TLS', secretValue);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toMatchObject({
        type: 'kubectl',
        secretName: 'INGRESS_TLS',
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'my-tls',
            namespace: 'production',
          },
          type: 'kubernetes.io/tls',
          data: {
            'tls.crt': expect.any(String),
            'tls.key': expect.any(String),
          },
        },
      });
    });

    it('should base64 encode cert and key', () => {
      const provider = new TlsSecretProvider({ name: 'my-secret' });

      const effects = provider.prepare('TLS', {
        cert: 'cert-content',
        key: 'key-content',
      });

      // Base64 of 'cert-content' is 'Y2VydC1jb250ZW50'
      // Base64 of 'key-content' is 'a2V5LWNvbnRlbnQ='
      expect(effects[0].value.data['tls.crt']).toBe('Y2VydC1jb250ZW50');
      expect(effects[0].value.data['tls.key']).toBe('a2V5LWNvbnRlbnQ=');
    });

    it('should use default namespace when not specified', () => {
      const provider = new TlsSecretProvider({ name: 'my-secret' });

      const effects = provider.prepare('TLS', {
        cert: 'cert',
        key: 'key',
      });

      expect(effects[0].value.metadata.namespace).toBe('default');
    });

    it('should throw error if cert is missing', () => {
      const provider = new TlsSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('TLS', {
          key: 'key-only',
        } as any);
      }).toThrow(/cert/);
    });

    it('should throw error if key is missing', () => {
      const provider = new TlsSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('TLS', {
          cert: 'cert-only',
        } as any);
      }).toThrow(/key/);
    });

    it('should throw error if value is not an object', () => {
      const provider = new TlsSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('TLS', 'invalid-string' as any);
      }).toThrow();
    });
  });

  describe('getInjectionPayload() - env strategy', () => {
    it('should inject tls.crt with key="tls.crt"', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'TLS_CERT',
            strategy: { kind: 'env' as const, key: 'tls.crt' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          name: 'TLS_CERT',
          valueFrom: {
            secretKeyRef: {
              name: 'ingress-tls',
              key: 'tls.crt',
            },
          },
        },
      ]);
    });

    it('should inject tls.key with key="tls.key"', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'TLS_KEY',
            strategy: { kind: 'env' as const, key: 'tls.key' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          name: 'TLS_KEY',
          valueFrom: {
            secretKeyRef: {
              name: 'ingress-tls',
              key: 'tls.key',
            },
          },
        },
      ]);
    });

    it('should inject both tls.crt and tls.key as separate env vars', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'TLS_CERT',
            strategy: { kind: 'env' as const, key: 'tls.crt' },
          },
        },
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'TLS_KEY',
            strategy: { kind: 'env' as const, key: 'tls.key' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toHaveLength(2);
      const envVars = payload as any[];
      expect(envVars[0].name).toBe('TLS_CERT');
      expect(envVars[0].valueFrom?.secretKeyRef?.key).toBe('tls.crt');
      expect(envVars[1].name).toBe('TLS_KEY');
      expect(envVars[1].valueFrom?.secretKeyRef?.key).toBe('tls.key');
    });

    it('should throw error if key is missing in env strategy', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'TLS_CERT',
            strategy: { kind: 'env' as const }, // Missing key
          },
        },
      ];

      expect(() => {
        provider.getInjectionPayload(injections);
      }).toThrow(/key.*is required/i);
    });

    it('should throw error if key is not "tls.crt" or "tls.key"', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'TLS_CERT',
            strategy: { kind: 'env' as const, key: 'ca.crt' }, // Invalid key
          },
        },
      ];

      expect(() => {
        provider.getInjectionPayload(injections);
      }).toThrow(/Invalid key.*ca\.crt/);
    });

    it('should throw error if targetName is missing', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: '', // Empty targetName
            strategy: { kind: 'env' as const, key: 'tls.crt' },
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
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'INGRESS_TLS', // Required by type even for envFrom
            strategy: { kind: 'envFrom' as const },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          secretRef: {
            name: 'ingress-tls',
          },
        },
      ]);
    });

    it('should inject entire secret with prefix', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'INGRESS_TLS', // Required by type even for envFrom
            strategy: { kind: 'envFrom' as const, prefix: 'TLS_' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          prefix: 'TLS_',
          secretRef: {
            name: 'ingress-tls',
          },
        },
      ]);
    });
  });

  describe('getTargetPath()', () => {
    it('should return correct path for env strategy', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const path = provider.getTargetPath({ kind: 'env', containerIndex: 0 });

      expect(path).toBe('spec.template.spec.containers[0].env');
    });

    it('should return correct path for env strategy with custom container index', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const path = provider.getTargetPath({ kind: 'env', containerIndex: 2 });

      expect(path).toBe('spec.template.spec.containers[2].env');
    });

    it('should return correct path for envFrom strategy', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const path = provider.getTargetPath({ kind: 'envFrom', containerIndex: 0 });

      expect(path).toBe('spec.template.spec.containers[0].envFrom');
    });

    it('should return correct path for envFrom strategy with custom container index', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const path = provider.getTargetPath({ kind: 'envFrom', containerIndex: 1 });

      expect(path).toBe('spec.template.spec.containers[1].envFrom');
    });

    it('should use custom targetPath if provided', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const path = provider.getTargetPath({
        kind: 'env',
        containerIndex: 0,
        targetPath: 'custom.path.to.env',
      });

      expect(path).toBe('custom.path.to.env');
    });

    it('should throw error for unsupported strategy', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      expect(() => {
        provider.getTargetPath({ kind: 'annotation' } as any);
      }).toThrow(/Unsupported injection strategy/);
    });
  });

  describe('getEffectIdentifier()', () => {
    it('should return namespace/name identifier', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'TLS',
        providerName: 'tls',
        value: {
          metadata: {
            name: 'ingress-tls',
            namespace: 'production',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('production/ingress-tls');
    });

    it('should use default namespace if not specified', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'TLS',
        providerName: 'tls',
        value: {
          metadata: {
            name: 'ingress-tls',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('default/ingress-tls');
    });
  });

  describe('mergeSecrets()', () => {
    it('should merge multiple effects for same secret', () => {
      const provider = new TlsSecretProvider({
        name: 'ingress-tls',
        namespace: 'default',
      });

      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'SECRET1',
          providerName: 'tls',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'ingress-tls',
              namespace: 'default',
            },
            type: 'kubernetes.io/tls',
            data: {
              'tls.crt': 'Y2VydDE=',
            },
          },
        },
        {
          type: 'kubectl' as const,
          secretName: 'SECRET1',
          providerName: 'tls',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'ingress-tls',
              namespace: 'default',
            },
            type: 'kubernetes.io/tls',
            data: {
              'tls.key': 'a2V5MQ==',
            },
          },
        },
      ];

      const merged = provider.mergeSecrets(effects);

      expect(merged).toHaveLength(1);
      expect(merged[0].value.data).toEqual({
        'tls.crt': 'Y2VydDE=',
        'tls.key': 'a2V5MQ==',
      });
    });

    it('should throw error on duplicate keys', () => {
      const provider = new TlsSecretProvider({
        name: 'ingress-tls',
        namespace: 'default',
      });

      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'SECRET1',
          providerName: 'tls',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'ingress-tls',
              namespace: 'default',
            },
            type: 'kubernetes.io/tls',
            data: {
              'tls.crt': 'Y2VydDE=',
            },
          },
        },
        {
          type: 'kubectl' as const,
          secretName: 'SECRET1',
          providerName: 'tls',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'ingress-tls',
              namespace: 'default',
            },
            type: 'kubernetes.io/tls',
            data: {
              'tls.crt': 'Y2VydDI=', // Duplicate key with different value
            },
          },
        },
      ];

      expect(() => {
        provider.mergeSecrets(effects);
      }).toThrow(/Conflict.*tls\.crt/);
    });
  });

  describe('supportedStrategies', () => {
    it('should support env and envFrom strategies', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      expect(provider.supportedStrategies).toContain('env');
      expect(provider.supportedStrategies).toContain('envFrom');
      expect(provider.supportedStrategies).toHaveLength(2);
    });
  });

  describe('provider metadata', () => {
    it('should have correct secretType', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      expect(provider.secretType).toBe('Kubernetes.Secret.Tls');
    });

    it('should have correct targetKind', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      expect(provider.targetKind).toBe('Deployment');
    });

    it('should allow merge', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      expect(provider.allowMerge).toBe(true);
    });
  });

  describe('Strategy Validation', () => {
    describe('Mixed Strategy Validation', () => {
      it('should throw error when env and envFrom strategies are mixed', () => {
        const provider = new TlsSecretProvider({ name: 'test-tls', namespace: 'default' });

        const mixedInjections: ProviderInjection[] = [
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].customPath',
            meta: {
              secretName: 'TLS1',
              targetName: 'TLS_CERT',
              strategy: { kind: 'env', key: 'tls.crt' },
            },
          },
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].customPath',
            meta: {
              secretName: 'TLS2',
              targetName: 'TLS2',
              strategy: { kind: 'envFrom', prefix: 'TLS_' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(
          /mixed injection strategies are not allowed/i
        );
        expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(/env, envFrom/);
      });

      it('should include helpful context in error message', () => {
        const provider = new TlsSecretProvider({ name: 'test-tls', namespace: 'default' });

        const mixedInjections: ProviderInjection[] = [
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'TLS1',
              targetName: 'TLS_CERT',
              strategy: { kind: 'env', key: 'tls.crt' },
            },
          },
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'TLS2',
              targetName: 'TLS2',
              strategy: { kind: 'envFrom' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(/framework bug or incorrect targetPath/i);
      });
    });

    describe('envFrom Prefix Validation', () => {
      it('should throw error when multiple different prefixes are used', () => {
        const provider = new TlsSecretProvider({ name: 'shared-tls', namespace: 'default' });

        const conflictingInjections: ProviderInjection[] = [
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'INGRESS_TLS',
              targetName: 'INGRESS_TLS',
              strategy: { kind: 'envFrom', prefix: 'INGRESS_' },
            },
          },
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'API_TLS',
              targetName: 'API_TLS',
              strategy: { kind: 'envFrom', prefix: 'API_' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(
          /multiple envFrom prefixes detected/i
        );
        expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(/INGRESS_, API_/);
      });

      it('should throw error when mixing prefixed and non-prefixed envFrom', () => {
        const provider = new TlsSecretProvider({ name: 'shared-tls', namespace: 'default' });

        const conflictingInjections: ProviderInjection[] = [
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'TLS1',
              targetName: 'TLS1',
              strategy: { kind: 'envFrom', prefix: 'TLS_' },
            },
          },
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'TLS2',
              targetName: 'TLS2',
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
        const provider = new TlsSecretProvider({ name: 'test-tls', namespace: 'default' });

        const validInjections: ProviderInjection[] = [
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'TLS1',
              targetName: 'TLS1',
              strategy: { kind: 'envFrom', prefix: 'TLS_' },
            },
          },
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'TLS2',
              targetName: 'TLS2',
              strategy: { kind: 'envFrom', prefix: 'TLS_' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
      });

      it('should accept multiple envFrom injections with no prefix (undefined)', () => {
        const provider = new TlsSecretProvider({ name: 'test-tls', namespace: 'default' });

        const validInjections: ProviderInjection[] = [
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'TLS1',
              targetName: 'TLS1',
              strategy: { kind: 'envFrom' },
            },
          },
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'TLS2',
              targetName: 'TLS2',
              strategy: { kind: 'envFrom' },
            },
          },
        ];

        expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
      });
    });

    describe('env Strategy Validation', () => {
      it('should accept multiple env injections with different keys', () => {
        const provider = new TlsSecretProvider({ name: 'test-tls', namespace: 'default' });

        const validInjections: ProviderInjection[] = [
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'INGRESS_TLS',
              targetName: 'TLS_CERT',
              strategy: { kind: 'env', key: 'tls.crt' },
            },
          },
          {
            providerId: 'tls',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'INGRESS_TLS',
              targetName: 'TLS_KEY',
              strategy: { kind: 'env', key: 'tls.key' },
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
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const payload = provider.getInjectionPayload([]);

      expect(payload).toEqual([]);
    });

    it('should throw error for unsupported strategy kind in getInjectionPayload', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections: ProviderInjection[] = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].volumeMounts',
          meta: {
            secretName: 'TLS1',
            targetName: 'TLS1',
            strategy: { kind: 'volume' } as any,
          },
        },
      ];

      expect(() => provider.getInjectionPayload(injections)).toThrow(/Unsupported strategy kind/);
    });

    it('should use custom targetPath for env strategy', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const path = provider.getTargetPath({
        kind: 'env',
        containerIndex: 0,
        targetPath: 'custom.path.to.env',
      });

      expect(path).toBe('custom.path.to.env');
    });

    it('should use custom targetPath for envFrom strategy', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const path = provider.getTargetPath({
        kind: 'envFrom',
        containerIndex: 0,
        targetPath: 'custom.path.to.envFrom',
      });

      expect(path).toBe('custom.path.to.envFrom');
    });

    it('should infer env strategy from path without .envFrom', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections: ProviderInjection[] = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'TLS_CERT',
            // No strategy provided - will be inferred from path
            strategy: { kind: 'env', key: 'tls.crt' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toHaveLength(1);
      expect((payload as any)[0].name).toBe('TLS_CERT');
    });

    it('should infer env strategy for path without .envFrom in extractStrategy', () => {
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      // Create injection without explicit strategy - will use path inference
      const injections: ProviderInjection[] = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.customPath',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'TLS_CERT',
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
      const provider = new TlsSecretProvider({ name: 'ingress-tls' });

      const injections: ProviderInjection[] = [
        {
          providerId: 'tls',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'INGRESS_TLS',
            targetName: 'INGRESS_TLS',
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
