/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import { DockerConfigSecretProvider } from './DockerConfigSecretProvider.js';

describe('DockerConfigSecretProvider', () => {
  describe('prepare()', () => {
    it('should generate correct kubernetes.io/dockerconfigjson Secret', () => {
      const provider = new DockerConfigSecretProvider({
        name: 'my-docker-secret',
        namespace: 'production',
      });

      const secretValue = {
        username: 'dockeruser',
        password: 'dockerpass',
        registry: 'docker.io',
      };

      const effects = provider.prepare('DOCKER_REGISTRY', secretValue);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toMatchObject({
        type: 'kubectl',
        secretName: 'DOCKER_REGISTRY',
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'my-docker-secret',
            namespace: 'production',
          },
          type: 'kubernetes.io/dockerconfigjson',
          data: {
            '.dockerconfigjson': expect.any(String),
          },
        },
      });
    });

    it('should base64 encode dockerconfigjson correctly', () => {
      const provider = new DockerConfigSecretProvider({ name: 'my-secret' });

      const effects = provider.prepare('DOCKER_CREDS', {
        username: 'testuser',
        password: 'testpass',
        registry: 'ghcr.io',
      });

      const dockerConfigJson = effects[0].value.data['.dockerconfigjson'];
      expect(dockerConfigJson).toBeTruthy();

      // Decode and verify structure
      const decoded = JSON.parse(atob(dockerConfigJson));
      expect(decoded).toHaveProperty('auths');
      expect(decoded.auths).toHaveProperty('ghcr.io');
      expect(decoded.auths['ghcr.io']).toMatchObject({
        username: 'testuser',
        password: 'testpass',
        auth: expect.any(String),
      });
    });

    it('should generate correct auth token', () => {
      const provider = new DockerConfigSecretProvider({ name: 'my-secret' });

      const effects = provider.prepare('DOCKER_CREDS', {
        username: 'user',
        password: 'pass',
        registry: 'docker.io',
      });

      const dockerConfigJson = effects[0].value.data['.dockerconfigjson'];
      const decoded = JSON.parse(atob(dockerConfigJson));

      // auth should be base64(username:password)
      const expectedAuth = btoa('user:pass');
      expect(decoded.auths['docker.io'].auth).toBe(expectedAuth);
    });

    it('should use default namespace when not specified', () => {
      const provider = new DockerConfigSecretProvider({ name: 'my-secret' });

      const effects = provider.prepare('DOCKER_CREDS', {
        username: 'user',
        password: 'pass',
        registry: 'docker.io',
      });

      expect(effects[0].value.metadata.namespace).toBe('default');
    });

    it('should throw error if username is missing', () => {
      const provider = new DockerConfigSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('DOCKER_CREDS', {
          password: 'pass',
          registry: 'docker.io',
        } as any);
      }).toThrow(/username/);
    });

    it('should throw error if password is missing', () => {
      const provider = new DockerConfigSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('DOCKER_CREDS', {
          username: 'user',
          registry: 'docker.io',
        } as any);
      }).toThrow(/password/);
    });

    it('should throw error if registry is missing', () => {
      const provider = new DockerConfigSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('DOCKER_CREDS', {
          username: 'user',
          password: 'pass',
        } as any);
      }).toThrow(/registry/);
    });

    it('should throw error if value is not an object', () => {
      const provider = new DockerConfigSecretProvider({ name: 'my-secret' });

      expect(() => {
        provider.prepare('DOCKER_CREDS', 'invalid-string' as any);
      }).toThrow();
    });
  });

  describe('getInjectionPayload()', () => {
    it('should return correct imagePullSecret payload', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      const payload = provider.getInjectionPayload();

      expect(payload).toEqual([{ name: 'docker-auth' }]);
    });
  });

  describe('getTargetPath()', () => {
    it('should return correct path for imagePullSecret strategy', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      const path = provider.getTargetPath({ kind: 'imagePullSecret' });

      expect(path).toBe('spec.template.spec.imagePullSecrets');
    });

    it('should use custom targetPath if provided', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      const path = provider.getTargetPath({
        kind: 'imagePullSecret',
        targetPath: 'custom.path.to.imagePullSecrets',
      });

      expect(path).toBe('custom.path.to.imagePullSecrets');
    });

    it('should throw error for unsupported strategy', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      expect(() => {
        provider.getTargetPath({ kind: 'env' } as any);
      }).toThrow(/Unsupported injection strategy/);
    });
  });

  describe('getEffectIdentifier()', () => {
    it('should return namespace/name identifier', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'DOCKER_CREDS',
        providerName: 'dockerConfig',
        value: {
          metadata: {
            name: 'docker-auth',
            namespace: 'production',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('production/docker-auth');
    });

    it('should use default namespace if not specified', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      const effect = {
        type: 'kubectl' as const,
        secretName: 'DOCKER_CREDS',
        providerName: 'dockerConfig',
        value: {
          metadata: {
            name: 'docker-auth',
          },
        },
      };

      const id = provider.getEffectIdentifier(effect);

      expect(id).toBe('default/docker-auth');
    });
  });

  describe('mergeSecrets()', () => {
    it('should delegate to merge handler', () => {
      const provider = new DockerConfigSecretProvider({
        name: 'docker-auth',
        namespace: 'default',
      });

      // Single effect should return as-is
      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'DOCKER1',
          providerName: 'dockerConfig',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'docker-auth',
              namespace: 'default',
            },
            type: 'kubernetes.io/dockerconfigjson',
            data: {
              '.dockerconfigjson': 'eyJhdXRocyI6eyJkb2NrZXIuaW8iOnsidXNlcm5hbWUiOiJ1c2VyMSJ9fX0=',
            },
          },
        },
      ];

      const merged = provider.mergeSecrets(effects);

      expect(merged).toHaveLength(1);
      expect(merged[0]).toEqual(effects[0]);
    });

    it('should handle effects from different namespaces separately', () => {
      const provider = new DockerConfigSecretProvider({
        name: 'docker-auth',
      });

      const effects = [
        {
          type: 'kubectl' as const,
          secretName: 'DOCKER1',
          providerName: 'dockerConfig',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'docker-auth',
              namespace: 'ns1',
            },
            type: 'kubernetes.io/dockerconfigjson',
            data: {
              '.dockerconfigjson': 'eyJhdXRocyI6eyJkb2NrZXIuaW8iOnsidXNlcm5hbWUiOiJ1c2VyMSJ9fX0=',
            },
          },
        },
        {
          type: 'kubectl' as const,
          secretName: 'DOCKER2',
          providerName: 'dockerConfig',
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: 'docker-auth',
              namespace: 'ns2',
            },
            type: 'kubernetes.io/dockerconfigjson',
            data: {
              '.dockerconfigjson': 'eyJhdXRocyI6eyJnaGNyLmlvIjp7InVzZXJuYW1lIjoidXNlcjIifX19',
            },
          },
        },
      ];

      const merged = provider.mergeSecrets(effects);

      // Should keep both since they're in different namespaces
      expect(merged).toHaveLength(2);
    });
  });

  describe('setInjects()', () => {
    it('should set injects correctly', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      const injections = [
        {
          providerId: 'dockerConfig',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.imagePullSecrets',
          meta: {
            secretName: 'DOCKER_CREDS',
            targetName: 'DOCKER_CREDS',
          },
        },
      ];

      provider.setInjects(injections);

      expect(provider.injectes).toBe(injections);
    });
  });

  describe('provider metadata', () => {
    it('should have correct secretType', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      expect(provider.secretType).toBe('Kubernetes.Secret.DockerConfigSecret');
    });

    it('should have correct targetKind', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      expect(provider.targetKind).toBe('Deployment');
    });

    it('should support imagePullSecret strategy', () => {
      const provider = new DockerConfigSecretProvider({ name: 'docker-auth' });

      expect(provider.supportedStrategies).toContain('imagePullSecret');
      expect(provider.supportedStrategies).toHaveLength(1);
    });
  });
});
