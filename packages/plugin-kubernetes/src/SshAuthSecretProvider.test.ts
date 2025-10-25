/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import type { ProviderInjection } from '@kubricate/core';

import { SshAuthSecretProvider } from './SshAuthSecretProvider.js';

describe('SshAuthSecretProvider', () => {
  describe('prepare()', () => {
    it('should generate correct kubernetes.io/ssh-auth Secret', () => {
      const provider = new SshAuthSecretProvider({
        name: 'git-ssh-credentials',
        namespace: 'production',
      });

      const secretValue = {
        'ssh-privatekey': '-----BEGIN OPENSSH PRIVATE KEY-----\ntest-key\n-----END OPENSSH PRIVATE KEY-----',
        known_hosts: 'github.com ssh-rsa AAAAB3NzaC...',
      };

      const effects = provider.prepare('GIT_SSH_KEY', secretValue);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toMatchObject({
        type: 'kubectl',
        secretName: 'GIT_SSH_KEY',
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'git-ssh-credentials',
            namespace: 'production',
          },
          type: 'kubernetes.io/ssh-auth',
          data: {
            'ssh-privatekey': expect.any(String),
            known_hosts: expect.any(String),
          },
        },
      });
    });

    it('should base64 encode ssh-privatekey', () => {
      const provider = new SshAuthSecretProvider({ name: 'my-ssh-secret' });

      const effects = provider.prepare('SSH_KEY', {
        'ssh-privatekey': 'test-private-key',
      });

      // Base64 of 'test-private-key' is 'dGVzdC1wcml2YXRlLWtleQ=='
      expect(effects[0].value.data['ssh-privatekey']).toBe('dGVzdC1wcml2YXRlLWtleQ==');
    });

    it('should base64 encode known_hosts when provided', () => {
      const provider = new SshAuthSecretProvider({ name: 'my-ssh-secret' });

      const effects = provider.prepare('SSH_KEY', {
        'ssh-privatekey': 'test-key',
        known_hosts: 'test-hosts',
      });

      // Base64 of 'test-hosts' is 'dGVzdC1ob3N0cw=='
      expect(effects[0].value.data.known_hosts).toBe('dGVzdC1ob3N0cw==');
    });

    it('should omit known_hosts when not provided', () => {
      const provider = new SshAuthSecretProvider({ name: 'my-ssh-secret' });

      const effects = provider.prepare('SSH_KEY', {
        'ssh-privatekey': 'test-key',
      });

      expect(effects[0].value.data).toHaveProperty('ssh-privatekey');
      expect(effects[0].value.data).not.toHaveProperty('known_hosts');
    });

    it('should use default namespace when not specified', () => {
      const provider = new SshAuthSecretProvider({ name: 'my-ssh-secret' });

      const effects = provider.prepare('SSH_KEY', {
        'ssh-privatekey': 'test-key',
      });

      expect(effects[0].value.metadata.namespace).toBe('default');
    });

    it('should use custom namespace when specified', () => {
      const provider = new SshAuthSecretProvider({
        name: 'my-ssh-secret',
        namespace: 'custom-namespace',
      });

      const effects = provider.prepare('SSH_KEY', {
        'ssh-privatekey': 'test-key',
      });

      expect(effects[0].value.metadata.namespace).toBe('custom-namespace');
    });

    it('should throw error if ssh-privatekey is missing', () => {
      const provider = new SshAuthSecretProvider({ name: 'my-ssh-secret' });

      expect(() => {
        provider.prepare('SSH_KEY', {
          known_hosts: 'test-hosts',
        } as any);
      }).toThrow(/ssh-privatekey/);
    });

    it('should throw error if value is not an object', () => {
      const provider = new SshAuthSecretProvider({ name: 'my-ssh-secret' });

      expect(() => {
        provider.prepare('SSH_KEY', 'invalid-string' as any);
      }).toThrow();
    });
  });

  describe('getInjectionPayload() - env strategy', () => {
    it('should inject ssh-privatekey with key="ssh-privatekey"', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'SSH_PRIVATE_KEY',
            strategy: { kind: 'env' as const, key: 'ssh-privatekey' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          name: 'SSH_PRIVATE_KEY',
          valueFrom: {
            secretKeyRef: {
              name: 'git-ssh',
              key: 'ssh-privatekey',
            },
          },
        },
      ]);
    });

    it('should inject known_hosts with key="known_hosts"', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'SSH_KNOWN_HOSTS',
            strategy: { kind: 'env' as const, key: 'known_hosts' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          name: 'SSH_KNOWN_HOSTS',
          valueFrom: {
            secretKeyRef: {
              name: 'git-ssh',
              key: 'known_hosts',
            },
          },
        },
      ]);
    });

    it('should inject both ssh-privatekey and known_hosts as separate env vars', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'SSH_PRIVATE_KEY',
            strategy: { kind: 'env' as const, key: 'ssh-privatekey' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'SSH_KNOWN_HOSTS',
            strategy: { kind: 'env' as const, key: 'known_hosts' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toHaveLength(2);
      const envVars = payload as any[];
      expect(envVars[0].name).toBe('SSH_PRIVATE_KEY');
      expect(envVars[0].valueFrom?.secretKeyRef?.key).toBe('ssh-privatekey');
      expect(envVars[1].name).toBe('SSH_KNOWN_HOSTS');
      expect(envVars[1].valueFrom?.secretKeyRef?.key).toBe('known_hosts');
    });

    it('should throw error if key is missing in env strategy', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'SSH_PRIVATE_KEY',
            strategy: { kind: 'env' as const }, // Missing key
          },
        },
      ];

      expect(() => {
        provider.getInjectionPayload(injections);
      }).toThrow(/key.*is required/i);
    });

    it('should throw error if key is not "ssh-privatekey" or "known_hosts"', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'SSH_KEY',
            strategy: { kind: 'env' as const, key: 'username' }, // Invalid key
          },
        },
      ];

      expect(() => {
        provider.getInjectionPayload(injections);
      }).toThrow(/Invalid key.*username/);
    });

    it('should throw error if targetName is missing', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: '', // Empty targetName
            strategy: { kind: 'env' as const, key: 'ssh-privatekey' },
          },
        },
      ] as any;

      expect(() => {
        provider.getInjectionPayload(injections);
      }).toThrow(/Missing targetName/);
    });

    it('should use correct environment variable name from targetName', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'MY_CUSTOM_SSH_KEY',
            strategy: { kind: 'env' as const, key: 'ssh-privatekey' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload[0]).toMatchObject({
        name: 'MY_CUSTOM_SSH_KEY',
      });
    });
  });

  describe('getInjectionPayload() - envFrom strategy', () => {
    it('should inject entire secret without prefix', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'GIT_SSH_KEY', // Required by type even for envFrom
            strategy: { kind: 'envFrom' as const },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          secretRef: {
            name: 'git-ssh',
          },
        },
      ]);
    });

    it('should inject entire secret with prefix', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'GIT_SSH_KEY',
            strategy: { kind: 'envFrom' as const, prefix: 'GIT_' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload).toEqual([
        {
          prefix: 'GIT_',
          secretRef: {
            name: 'git-ssh',
          },
        },
      ]);
    });

    it('should apply prefix correctly', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'GIT_SSH_KEY',
            targetName: 'GIT_SSH_KEY',
            strategy: { kind: 'envFrom' as const, prefix: 'SSH_AUTH_' },
          },
        },
      ];

      const payload = provider.getInjectionPayload(injections);

      expect(payload[0]).toHaveProperty('prefix', 'SSH_AUTH_');
    });

    it('should accept multiple envFrom injections with same prefix', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY1',
            targetName: 'SSH_KEY1',
            strategy: { kind: 'envFrom' as const, prefix: 'GIT_' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY2',
            targetName: 'SSH_KEY2',
            strategy: { kind: 'envFrom' as const, prefix: 'GIT_' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(injections)).not.toThrow();
      const payload = provider.getInjectionPayload(injections);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toHaveProperty('prefix', 'GIT_');
    });

    it('should accept multiple envFrom injections with no prefix', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY1',
            targetName: 'SSH_KEY1',
            strategy: { kind: 'envFrom' as const },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY2',
            targetName: 'SSH_KEY2',
            strategy: { kind: 'envFrom' as const },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(injections)).not.toThrow();
      const payload = provider.getInjectionPayload(injections);
      expect(payload).toHaveLength(1);
      expect(payload[0]).not.toHaveProperty('prefix');
    });

    it('should throw error when different prefixes are detected', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY1',
            targetName: 'SSH_KEY1',
            strategy: { kind: 'envFrom' as const, prefix: 'GIT_' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY2',
            targetName: 'SSH_KEY2',
            strategy: { kind: 'envFrom' as const, prefix: 'SSH_' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(injections)).toThrow(/multiple envFrom prefixes detected/i);
      expect(() => provider.getInjectionPayload(injections)).toThrow(/GIT_, SSH_/);
    });

    it('should throw error when mixing undefined and string prefix', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY1',
            targetName: 'SSH_KEY1',
            strategy: { kind: 'envFrom' as const, prefix: 'GIT_' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY2',
            targetName: 'SSH_KEY2',
            strategy: { kind: 'envFrom' as const },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(injections)).toThrow(/multiple envFrom prefixes detected/i);
      expect(() => provider.getInjectionPayload(injections)).toThrow(/\(none\)/);
    });

    it('should list all detected prefixes in error message', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const injections = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY1',
            targetName: 'SSH_KEY1',
            strategy: { kind: 'envFrom' as const, prefix: 'PREFIX_A_' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY2',
            targetName: 'SSH_KEY2',
            strategy: { kind: 'envFrom' as const, prefix: 'PREFIX_B_' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(injections)).toThrow(/PREFIX_A_, PREFIX_B_/);
    });
  });

  describe('Strategy Validation', () => {
    it('should return empty array when no injections provided', () => {
      const provider = new SshAuthSecretProvider({ name: 'test' });
      const payload = provider.getInjectionPayload([]);
      expect(payload).toEqual([]);
    });

    it('should infer strategy from path when meta.strategy is missing (envFrom)', () => {
      const provider = new SshAuthSecretProvider({ name: 'test' });
      const injectionWithoutMeta = {
        providerId: 'ssh',
        provider,
        resourceId: 'dep',
        path: 'spec.template.spec.containers[0].envFrom',
        meta: {
          secretName: 'KEY',
          targetName: 'KEY',
          // No strategy property
        },
      } as any;

      // Should infer 'envFrom' from path
      const payload = provider.getInjectionPayload([injectionWithoutMeta]);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toHaveProperty('secretRef');
    });

    it('should infer env strategy from path when meta.strategy is missing and path does not contain envFrom', () => {
      const provider = new SshAuthSecretProvider({ name: 'test' });
      const injectionWithoutMeta = {
        providerId: 'ssh',
        provider,
        resourceId: 'dep',
        path: 'spec.template.spec.containers[0].env',
        meta: {
          secretName: 'KEY',
          targetName: 'SSH_KEY',
          // No strategy property, and path doesn't have '.envFrom'
        },
      } as any;

      // Should infer 'env' from path (fallback)
      expect(() => provider.getInjectionPayload([injectionWithoutMeta])).toThrow(/key.*is required/i);
    });

    it('should throw for unsupported strategy kind', () => {
      const provider = new SshAuthSecretProvider({ name: 'test' });
      const invalidInjection = {
        providerId: 'ssh',
        provider,
        resourceId: 'dep',
        path: 'custom.path',
        meta: {
          secretName: 'KEY',
          targetName: 'KEY',
          strategy: { kind: 'volume' }, // Not supported
        },
      } as any;

      expect(() => provider.getInjectionPayload([invalidInjection])).toThrow(/Unsupported strategy kind: volume/);
    });

    it('should throw error when env and envFrom strategies are mixed', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh', namespace: 'default' });

      const mixedInjections: ProviderInjection[] = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].customPath',
          meta: {
            secretName: 'SSH_KEY1',
            targetName: 'SSH_PRIVATE_KEY',
            strategy: { kind: 'env', key: 'ssh-privatekey' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].customPath',
          meta: {
            secretName: 'SSH_KEY2',
            targetName: 'SSH_KEY2',
            strategy: { kind: 'envFrom', prefix: 'GIT_' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(
        /mixed injection strategies are not allowed/i
      );
      expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(/env, envFrom/);
    });

    it('should include both strategy kinds in error message', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh', namespace: 'default' });

      const mixedInjections: ProviderInjection[] = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'SSH_KEY1',
            targetName: 'SSH_KEY',
            strategy: { kind: 'env', key: 'ssh-privatekey' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'SSH_KEY2',
            targetName: 'SSH_KEY2',
            strategy: { kind: 'envFrom' },
          },
        },
      ];

      const errorMessage = /Expected all injections to use 'env' but found: env, envFrom/;
      expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(errorMessage);
    });

    it('should include framework bug hint in error message', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh', namespace: 'default' });

      const mixedInjections: ProviderInjection[] = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'SSH_KEY1',
            targetName: 'SSH_KEY',
            strategy: { kind: 'env', key: 'ssh-privatekey' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'SSH_KEY2',
            targetName: 'SSH_KEY2',
            strategy: { kind: 'envFrom' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(/framework bug or incorrect targetPath/i);
    });

    it('should accept homogeneous env strategies', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh', namespace: 'default' });

      const validInjections: ProviderInjection[] = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'SSH_KEY',
            targetName: 'SSH_PRIVATE_KEY',
            strategy: { kind: 'env', key: 'ssh-privatekey' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'SSH_KEY',
            targetName: 'SSH_KNOWN_HOSTS',
            strategy: { kind: 'env', key: 'known_hosts' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
      const payload = provider.getInjectionPayload(validInjections);
      expect(payload).toHaveLength(2);
    });

    it('should accept homogeneous envFrom strategies', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh', namespace: 'default' });

      const validInjections: ProviderInjection[] = [
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY1',
            targetName: 'SSH_KEY1',
            strategy: { kind: 'envFrom', prefix: 'GIT_' },
          },
        },
        {
          providerId: 'sshAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'SSH_KEY2',
            targetName: 'SSH_KEY2',
            strategy: { kind: 'envFrom', prefix: 'GIT_' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
    });
  });

  describe('getTargetPath()', () => {
    it('should return correct default path for env strategy', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const path = provider.getTargetPath({ kind: 'env', containerIndex: 0 });

      expect(path).toBe('spec.template.spec.containers[0].env');
    });

    it('should return correct default path for envFrom strategy', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const path = provider.getTargetPath({ kind: 'envFrom', containerIndex: 0 });

      expect(path).toBe('spec.template.spec.containers[0].envFrom');
    });

    it('should honor containerIndex for env', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const path = provider.getTargetPath({ kind: 'env', containerIndex: 2 });

      expect(path).toBe('spec.template.spec.containers[2].env');
    });

    it('should honor containerIndex for envFrom', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const path = provider.getTargetPath({ kind: 'envFrom', containerIndex: 1 });

      expect(path).toBe('spec.template.spec.containers[1].envFrom');
    });

    it('should honor custom targetPath for env strategy', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const path = provider.getTargetPath({
        kind: 'env',
        containerIndex: 0,
        targetPath: 'custom.path.to.env',
      });

      expect(path).toBe('custom.path.to.env');
    });

    it('should honor custom targetPath for envFrom strategy', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const path = provider.getTargetPath({
        kind: 'envFrom',
        containerIndex: 0,
        targetPath: 'custom.path.to.envFrom',
      });

      expect(path).toBe('custom.path.to.envFrom');
    });

    it('should throw error for unsupported strategy kind', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      expect(() => {
        provider.getTargetPath({ kind: 'annotation' } as any);
      }).toThrow(/Unsupported injection strategy/);
    });
  });

  describe('getEffectIdentifier()', () => {
    it('should return namespace/name format', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'SSH_KEY',
        providerName: 'sshAuth',
        value: {
          metadata: {
            name: 'git-ssh',
            namespace: 'production',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('production/git-ssh');
    });

    it('should use default namespace when namespace is omitted', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'SSH_KEY',
        providerName: 'sshAuth',
        value: {
          metadata: {
            name: 'git-ssh',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('default/git-ssh');
    });

    it('should handle missing metadata in getEffectIdentifier', () => {
      const provider = new SshAuthSecretProvider({ name: 'test' });
      const effect = {
        type: 'kubectl' as const,
        secretName: 'KEY',
        providerName: 'ssh',
        value: {}, // Empty value - no metadata
      };
      const id = provider.getEffectIdentifier(effect);
      expect(id).toBe('default/undefined');
    });
  });

  describe('mergeSecrets()', () => {
    it('should merge compatible effects', () => {
      const provider = new SshAuthSecretProvider({
        name: 'git-ssh',
        namespace: 'default',
      });

      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'SSH_KEY',
          providerName: 'sshAuth',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'git-ssh',
              namespace: 'default',
            },
            type: 'kubernetes.io/ssh-auth',
            data: {
              'ssh-privatekey': 'a2V5MQ==',
            },
          },
        },
        {
          type: 'kubectl' as const,
          secretName: 'SSH_KEY',
          providerName: 'sshAuth',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'git-ssh',
              namespace: 'default',
            },
            type: 'kubernetes.io/ssh-auth',
            data: {
              known_hosts: 'aG9zdHMx',
            },
          },
        },
      ];

      const merged = provider.mergeSecrets(effects);

      expect(merged).toHaveLength(1);
      expect(merged[0].value.data).toEqual({
        'ssh-privatekey': 'a2V5MQ==',
        known_hosts: 'aG9zdHMx',
      });
    });

    it('should throw error on duplicate key conflicts', () => {
      const provider = new SshAuthSecretProvider({
        name: 'git-ssh',
        namespace: 'default',
      });

      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'SSH_KEY',
          providerName: 'sshAuth',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'git-ssh',
              namespace: 'default',
            },
            type: 'kubernetes.io/ssh-auth',
            data: {
              'ssh-privatekey': 'a2V5MQ==',
            },
          },
        },
        {
          type: 'kubectl' as const,
          secretName: 'SSH_KEY',
          providerName: 'sshAuth',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'git-ssh',
              namespace: 'default',
            },
            type: 'kubernetes.io/ssh-auth',
            data: {
              'ssh-privatekey': 'a2V5Mg==', // Different value for same key
            },
          },
        },
      ];

      expect(() => {
        provider.mergeSecrets(effects);
      }).toThrow(/Conflict.*ssh-privatekey/);
    });

    it('should preserve all unique keys', () => {
      const provider = new SshAuthSecretProvider({
        name: 'git-ssh',
        namespace: 'default',
      });

      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'SSH_KEY',
          providerName: 'sshAuth',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'git-ssh',
              namespace: 'default',
            },
            type: 'kubernetes.io/ssh-auth',
            data: {
              'ssh-privatekey': 'a2V5MQ==',
            },
          },
        },
      ];

      const merged = provider.mergeSecrets(effects);

      expect(merged).toHaveLength(1);
      expect(merged[0].value.data).toHaveProperty('ssh-privatekey', 'a2V5MQ==');
    });
  });

  describe('provider metadata', () => {
    it('should have secretType as Kubernetes.Secret.SshAuth', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      expect(provider.secretType).toBe('Kubernetes.Secret.SshAuth');
    });

    it('should have targetKind as Deployment', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      expect(provider.targetKind).toBe('Deployment');
    });

    it('should have allowMerge set to true', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      expect(provider.allowMerge).toBe(true);
    });

    it('should have supportedStrategies containing env and envFrom', () => {
      const provider = new SshAuthSecretProvider({ name: 'git-ssh' });

      expect(provider.supportedStrategies).toContain('env');
      expect(provider.supportedStrategies).toContain('envFrom');
      expect(provider.supportedStrategies).toHaveLength(2);
    });
  });
});
