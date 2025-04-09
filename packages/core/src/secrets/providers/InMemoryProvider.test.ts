/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProvider } from './InMemoryProvider.js';
import type { ProviderInjection } from './BaseProvider.js';

describe('InMemoryProvider', () => {
  let provider: InMemoryProvider;

  beforeEach(() => {
    provider = new InMemoryProvider({ name: 'custom-secret-name' });
  });

  it('should return correct target path for env strategy', () => {
    const path = provider.getTargetPath({ kind: 'env', containerIndex: 2 });
    expect(path).toBe('spec.template.spec.containers[2].env');
  });

  it('should default to containerIndex 0 if not provided', () => {
    const path = provider.getTargetPath({ kind: 'env' });
    expect(path).toBe('spec.template.spec.containers[0].env');
  });

  it('should throw error for unsupported strategy', () => {
    expect(() =>
      provider.getTargetPath({ kind: 'annotation' } as any)
    ).toThrowError('[InMemoryProvider] Unsupported strategy: annotation');
  });

  it('should return correct injection payload using configured secret name', () => {
    const injectes: ProviderInjection[] = [
      {
        meta: {
          targetName: 'API_KEY',
          secretName: 'REAL_SECRET',
        },
        path: 'spec.template.spec.containers[0].env',
        provider: provider,
        providerId: 'p1',
        resourceId: 'res-1',
      },
    ];

    provider.setInjects(injectes);
    const payload = provider.getInjectionPayload();

    expect(payload).toEqual([
      {
        name: 'API_KEY',
        valueFrom: {
          secretKeyRef: {
            name: 'custom-secret-name',
            key: 'REAL_SECRET',
          },
        },
      },
    ]);
  });

  it('should fallback to default in-memory name if no config name', () => {
    const unnamedProvider = new InMemoryProvider();

    const injectes: ProviderInjection[] = [
      {
        meta: {
          targetName: 'TOKEN',
          secretName: 'SECRET_TOKEN',
        },
        path: '',
        provider: unnamedProvider,
        providerId: 'p2',
        resourceId: 'res-2',
      },
    ];

    unnamedProvider.setInjects(injectes);
    const payload = unnamedProvider.getInjectionPayload() as any;

    expect(payload[0].valueFrom.secretKeyRef.name).toBe('in-memory');
  });

  it('should prepare secret value into custom effect format', () => {
    const effect = provider.prepare('DB_PASSWORD', 'hunter2');

    expect(effect).toEqual([
      {
        type: 'custom',
        value: {
          secretName: 'DB_PASSWORD',
          value: 'hunter2',
        },
      },
    ]);
  });
});
