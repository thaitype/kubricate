/* eslint-disable @typescript-eslint/no-explicit-any */
import { Base64 } from 'js-base64';
import { describe, expect, test } from 'vitest';

import type { ProviderInjection } from '@kubricate/core';

import type { EnvFromSource } from './BasicAuthSecretProvider.js';
import { CustomTypeSecretProvider } from './CustomTypeSecretProvider.js';
import type { EnvVar } from './kubernetes-types.js';

describe('CustomTypeSecretProvider', () => {
  describe('Configuration Validation', () => {
    test('should throw error when secretType is empty string', () => {
      expect(() => {
        new CustomTypeSecretProvider({
          name: 'test-secret',
          secretType: '',
        });
      }).toThrow('[CustomTypeSecretProvider] secretType cannot be empty');
    });

    test('should throw error when secretType is only whitespace', () => {
      expect(() => {
        new CustomTypeSecretProvider({
          name: 'test-secret',
          secretType: '   ',
        });
      }).toThrow('[CustomTypeSecretProvider] secretType cannot be empty');
    });

    test('should accept valid secretType', () => {
      expect(() => {
        new CustomTypeSecretProvider({
          name: 'test-secret',
          secretType: 'vendor.com/custom',
        });
      }).not.toThrow();
    });
  });

  describe('Basic Secret Creation', () => {
    test('should create Secret with custom type', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        namespace: 'test',
        secretType: 'vendor.com/custom',
      });

      const effects = provider.prepare('API_TOKEN', {
        api_key: 'secret-value',
        endpoint: 'https://api.example.com',
      });

      expect(effects).toHaveLength(1);
      expect(effects[0].value.type).toBe('vendor.com/custom');
      expect(effects[0].value.data).toBeDefined();
      expect(effects[0].value.metadata.name).toBe('custom-secret');
      expect(effects[0].value.metadata.namespace).toBe('test');

      // Verify base64 encoding
      expect(effects[0].value.data.api_key).toBe(Base64.encode('secret-value'));
      expect(effects[0].value.data.endpoint).toBe(Base64.encode('https://api.example.com'));
    });

    test('should use default namespace when not specified', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        secretType: 'vendor.com/custom',
      });

      const effects = provider.prepare('API_TOKEN', {
        api_key: 'secret-value',
      });

      expect(effects[0].value.metadata.namespace).toBe('default');
    });

    test('should handle empty value object', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        secretType: 'vendor.com/empty',
      });

      const effects = provider.prepare('EMPTY_SECRET', {});

      expect(effects).toHaveLength(1);
      expect(effects[0].value.data).toEqual({});
    });

    test('should create Secret with Opaque type', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'opaque-custom',
        secretType: 'Opaque',
      });

      const effects = provider.prepare('TEST', { key: 'value' });

      expect(effects).toHaveLength(1);
      expect(effects[0].value.type).toBe('Opaque');
    });
  });

  describe('Env Injection Strategy', () => {
    test('should inject single key as env variable', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        secretType: 'vendor.com/token',
      });

      provider.prepare('API_TOKEN', { token: 'abc123', url: 'https://api.com' });

      const payload = provider.getInjectionPayload([
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_TOKEN',
            targetName: 'VENDOR_TOKEN',
            strategy: { kind: 'env', key: 'token' },
          },
        },
      ]);

      expect(payload).toHaveLength(1);
      expect(payload).toContainEqual({
        name: 'VENDOR_TOKEN',
        valueFrom: {
          secretKeyRef: {
            name: 'custom-secret',
            key: 'token',
          },
        },
      });
    });

    test('should inject multiple keys as env variables', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        secretType: 'vendor.com/api',
      });

      provider.prepare('API_CONFIG', { api_key: 'key123', api_url: 'https://api.com' });

      const payload = provider.getInjectionPayload([
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CONFIG',
            targetName: 'API_KEY',
            strategy: { kind: 'env', key: 'api_key' },
          },
        },
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_CONFIG',
            targetName: 'API_URL',
            strategy: { kind: 'env', key: 'api_url' },
          },
        },
      ]);

      expect(payload).toHaveLength(2);
      expect((payload as EnvVar[])[0].name).toBe('API_KEY');
      expect((payload as EnvVar[])[1].name).toBe('API_URL');
    });

    test('should use secretName as fallback when targetName is missing', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        secretType: 'vendor.com/token',
      });

      provider.prepare('API_TOKEN', { token: 'abc123' });

      const payload = provider.getInjectionPayload([
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'API_TOKEN',
            strategy: { kind: 'env', key: 'token' },
          } as any,
        },
      ]);

      expect(payload).toHaveLength(1);
      expect((payload as EnvVar[])[0].name).toBe('API_TOKEN');
    });

    test('should throw error when key is missing for env injection', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        secretType: 'vendor.com/token',
      });

      provider.prepare('API_TOKEN', { token: 'abc123' });

      expect(() => {
        provider.getInjectionPayload([
          {
            providerId: 'custom',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'API_TOKEN',
              targetName: 'TOKEN',
              strategy: { kind: 'env' },
            },
          } as ProviderInjection,
        ]);
      }).toThrow(/'key' is required for env injection/i);
    });
  });

  describe('EnvFrom Injection Strategy', () => {
    test('should inject all keys as envFrom', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        secretType: 'acme.corp/config',
      });

      provider.prepare('CONFIG', { key1: 'val1', key2: 'val2' });

      const payload = provider.getInjectionPayload([
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'CONFIG',
            strategy: { kind: 'envFrom', prefix: 'APP_' },
          } as any,
        },
      ]);

      expect(payload).toHaveLength(1);
      expect(payload).toContainEqual({
        secretRef: { name: 'custom-secret' },
        prefix: 'APP_',
      });
    });

    test('should inject all keys as envFrom without prefix', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        secretType: 'vendor.com/config',
      });

      provider.prepare('CONFIG', { key1: 'val1', key2: 'val2' });

      const payload = provider.getInjectionPayload([
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'CONFIG',
            strategy: { kind: 'envFrom' },
          } as any,
        },
      ]);

      expect(payload).toHaveLength(1);
      expect(payload[0]).toEqual({
        secretRef: { name: 'custom-secret' },
      });
      expect(payload[0]).not.toHaveProperty('prefix');
    });

    test('should throw error when multiple prefixes are detected', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'custom-secret',
        secretType: 'vendor.com/config',
      });

      provider.prepare('CONFIG', { key1: 'val1', key2: 'val2' });

      expect(() => {
        provider.getInjectionPayload([
          {
            providerId: 'custom',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'CONFIG',
              strategy: { kind: 'envFrom', prefix: 'APP_' },
            } as any,
          },
          {
            providerId: 'custom',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'CONFIG',
              strategy: { kind: 'envFrom', prefix: 'OTHER_' },
            } as any,
          },
        ]);
      }).toThrow(/Multiple envFrom prefixes detected/i);
    });
  });

  describe('AllowedKeys Validation', () => {
    test('should enforce allowedKeys constraint', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'restricted-secret',
        secretType: 'vendor.com/api',
        allowedKeys: ['api_key', 'endpoint'],
      });

      expect(() => {
        provider.prepare('API', { api_key: 'abc', invalid_key: 'xyz' });
      }).toThrow(/Invalid keys provided.*invalid_key/i);
    });

    test('should accept only allowed keys', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'restricted-secret',
        secretType: 'vendor.com/api',
        allowedKeys: ['api_key', 'endpoint'],
      });

      const effects = provider.prepare('API', { api_key: 'abc', endpoint: 'https://api.com' });

      expect(effects).toHaveLength(1);
      expect(effects[0].value.data).toHaveProperty('api_key');
      expect(effects[0].value.data).toHaveProperty('endpoint');
    });

    test('should accept subset of allowed keys', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'restricted-secret',
        secretType: 'vendor.com/api',
        allowedKeys: ['api_key', 'endpoint', 'timeout'],
      });

      const effects = provider.prepare('API', { api_key: 'abc' });

      expect(effects).toHaveLength(1);
      expect(effects[0].value.data).toHaveProperty('api_key');
      expect(effects[0].value.data).not.toHaveProperty('endpoint');
    });

    test('should allow any keys when allowedKeys is not specified', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'unrestricted-secret',
        secretType: 'vendor.com/api',
      });

      const effects = provider.prepare('API', {
        any_key: 'value1',
        another_key: 'value2',
        yet_another: 'value3',
      });

      expect(effects).toHaveLength(1);
      expect(Object.keys(effects[0].value.data)).toHaveLength(3);
    });

    test('should throw error with multiple invalid keys', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'restricted-secret',
        secretType: 'vendor.com/api',
        allowedKeys: ['api_key'],
      });

      expect(() => {
        provider.prepare('API', { api_key: 'abc', invalid1: 'x', invalid2: 'y' });
      }).toThrow(/Invalid keys provided.*invalid1.*invalid2/i);
    });

    test('should throw error when injecting with key not in allowedKeys', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'restricted-secret',
        secretType: 'vendor.com/api',
        allowedKeys: ['api_key', 'endpoint'],
      });

      provider.prepare('API', { api_key: 'abc', endpoint: 'https://api.com' });

      expect(() => {
        provider.getInjectionPayload([
          {
            providerId: 'custom',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'API',
              targetName: 'INVALID_KEY',
              strategy: { kind: 'env', key: 'invalid_key' },
            },
          },
        ]);
      }).toThrow(/Key 'invalid_key' is not allowed/i);
    });
  });

  describe('Strategy Mixing Validation', () => {
    test('should reject mixed strategies', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'mixed-secret',
        secretType: 'test/mixed',
      });

      provider.prepare('MIXED', { key1: 'val1', key2: 'val2' });

      expect(() => {
        provider.getInjectionPayload([
          {
            providerId: 'custom',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].env',
            meta: {
              secretName: 'MIXED',
              targetName: 'KEY1',
              strategy: { kind: 'env', key: 'key1' },
            },
          },
          {
            providerId: 'custom',
            provider,
            resourceId: 'deployment',
            path: 'spec.template.spec.containers[0].envFrom',
            meta: {
              secretName: 'MIXED',
              strategy: { kind: 'envFrom' },
            } as any,
          },
        ]);
      }).toThrow(/Mixed injection strategies are not allowed/i);
    });

    test('should accept all env strategies', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'env-secret',
        secretType: 'test/env',
      });

      provider.prepare('ENV', { key1: 'val1', key2: 'val2' });

      const payload = provider.getInjectionPayload([
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'ENV',
            targetName: 'KEY1',
            strategy: { kind: 'env', key: 'key1' },
          },
        },
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'ENV',
            targetName: 'KEY2',
            strategy: { kind: 'env', key: 'key2' },
          },
        },
      ]);

      expect(payload).toHaveLength(2);
    });

    test('should accept all envFrom strategies with same prefix', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'envfrom-secret',
        secretType: 'test/envfrom',
      });

      provider.prepare('ENVFROM', { key1: 'val1', key2: 'val2' });

      const payload = provider.getInjectionPayload([
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'ENVFROM',
            strategy: { kind: 'envFrom', prefix: 'APP_' },
          } as any,
        },
        {
          providerId: 'custom',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'ENVFROM',
            strategy: { kind: 'envFrom', prefix: 'APP_' },
          } as any,
        },
      ]);

      expect(payload).toHaveLength(1);
      expect((payload as EnvFromSource[])[0].prefix).toBe('APP_');
    });
  });

  describe('Secret Merging', () => {
    test('should merge duplicate secrets correctly', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'merge-secret',
        namespace: 'default',
        secretType: 'test/merge',
      });

      const effects1 = provider.prepare('TOKEN1', { key1: 'value1' });
      const effects2 = provider.prepare('TOKEN2', { key2: 'value2' });

      const merged = provider.mergeSecrets([...effects1, ...effects2]);

      // Should merge into single secret with both keys
      expect(merged).toHaveLength(1);
      expect(merged[0].value.data).toHaveProperty('key1');
      expect(merged[0].value.data).toHaveProperty('key2');
    });

    test('should handle merging with different namespaces', () => {
      const provider1 = new CustomTypeSecretProvider({
        name: 'merge-secret',
        namespace: 'ns1',
        secretType: 'test/merge',
      });

      const provider2 = new CustomTypeSecretProvider({
        name: 'merge-secret',
        namespace: 'ns2',
        secretType: 'test/merge',
      });

      const effects1 = provider1.prepare('TOKEN1', { key1: 'value1' });
      const effects2 = provider2.prepare('TOKEN2', { key2: 'value2' });

      const merged = provider1.mergeSecrets([...effects1, ...effects2]);

      // Should not merge because they're in different namespaces
      expect(merged).toHaveLength(2);
    });
  });

  describe('getTargetPath', () => {
    test('should return correct path for env strategy', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'test-secret',
        secretType: 'test/type',
      });

      const path = provider.getTargetPath({ kind: 'env' });

      expect(path).toBe('spec.template.spec.containers[0].env');
    });

    test('should return correct path for env strategy with custom container index', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'test-secret',
        secretType: 'test/type',
      });

      const path = provider.getTargetPath({ kind: 'env', containerIndex: 2 });

      expect(path).toBe('spec.template.spec.containers[2].env');
    });

    test('should return custom target path when specified', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'test-secret',
        secretType: 'test/type',
      });

      const path = provider.getTargetPath({ kind: 'env', targetPath: 'custom.path.env' });

      expect(path).toBe('custom.path.env');
    });

    test('should return correct path for envFrom strategy', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'test-secret',
        secretType: 'test/type',
      });

      const path = provider.getTargetPath({ kind: 'envFrom' });

      expect(path).toBe('spec.template.spec.containers[0].envFrom');
    });

    test('should throw error for unsupported strategy', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'test-secret',
        secretType: 'test/type',
      });

      expect(() => {
        provider.getTargetPath({ kind: 'unsupported' } as any);
      }).toThrow(/Unsupported injection strategy/i);
    });
  });

  describe('getEffectIdentifier', () => {
    test('should return correct identifier', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'test-secret',
        namespace: 'test-ns',
        secretType: 'test/type',
      });

      const effects = provider.prepare('TEST', { key: 'value' });

      const identifier = provider.getEffectIdentifier(effects[0]);

      expect(identifier).toBe('test-ns/test-secret');
    });

    test('should use default namespace in identifier', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'test-secret',
        secretType: 'test/type',
      });

      const effects = provider.prepare('TEST', { key: 'value' });

      const identifier = provider.getEffectIdentifier(effects[0]);

      expect(identifier).toBe('default/test-secret');
    });
  });

  describe('Empty injection arrays', () => {
    test('should return empty array for empty injections', () => {
      const provider = new CustomTypeSecretProvider({
        name: 'test-secret',
        secretType: 'test/type',
      });

      const payload = provider.getInjectionPayload([]);

      expect(payload).toEqual([]);
    });
  });
});
