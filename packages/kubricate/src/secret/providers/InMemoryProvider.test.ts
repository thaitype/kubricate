/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';

import type { PreparedEffect } from '@kubricate/core';

import { InMemoryProvider } from './InMemoryProvider.js';

describe('InMemoryProvider', () => {
  it('should return correct path for env strategy', () => {
    const provider = new InMemoryProvider();
    const path = provider.getTargetPath({ kind: 'env', containerIndex: 1 });
    expect(path).toBe('spec.template.spec.containers[1].env');
  });

  it('should fallback to index 0 for env path if not provided', () => {
    const provider = new InMemoryProvider();
    expect(provider.getTargetPath({ kind: 'env' })).toBe('spec.template.spec.containers[0].env');
  });

  it('should throw for unsupported strategy', () => {
    const provider = new InMemoryProvider();
    expect(() => provider.getTargetPath({ kind: 'volume' } as any)).toThrow(
      '[InMemoryProvider] Unsupported strategy: volume'
    );
  });

  it('should return correct injection payload', () => {
    const provider = new InMemoryProvider({ name: 'my-secret' });

    provider.setInjects([
      {
        meta: {
          secretName: 'SECRET1',
          targetName: 'API_KEY',
        },
        path: 'some.path',
        provider,
        providerId: 'p-id',
        resourceId: 'res-id',
      },
    ]);

    expect(provider.getInjectionPayload()).toEqual([
      {
        name: 'API_KEY',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'SECRET1',
          },
        },
      },
    ]);
  });

  it('should fallback to "in-memory" if no name in config', () => {
    const provider = new InMemoryProvider();

    provider.setInjects([
      {
        meta: {
          secretName: 'S1',
          targetName: 'ENV1',
        },
        path: '',
        provider,
        providerId: '',
        resourceId: '',
      },
    ]);

    const payload = provider.getInjectionPayload() as any;
    expect(payload[0].valueFrom.secretKeyRef.name).toBe('in-memory');
  });

  it('should prepare a secret into a PreparedEffect', () => {
    const provider = new InMemoryProvider({ name: 'store-a' });

    const result = provider.prepare('TOKEN', 'abc123');
    expect(result).toEqual([
      {
        secretName: 'TOKEN',
        type: 'custom',
        providerName: undefined,
        value: {
          storeName: 'store-a',
          rawData: {
            TOKEN: 'abc123',
          },
        },
      },
    ]);
  });

  it('should merge multiple effects correctly using mergeSecrets()', () => {
    const provider = new InMemoryProvider({ name: 'merged' });

    const effects: PreparedEffect[] = [provider.prepare('DB_USER', 'admin')[0], provider.prepare('DB_PASS', '1234')[0]];

    const result = provider.mergeSecrets(effects);
    expect(result).toHaveLength(1);
    expect(result[0].value.rawData).toEqual({
      DB_USER: 'admin',
      DB_PASS: '1234',
    });
  });

  it('should throw on merge if keys conflict in same store', () => {
    const provider = new InMemoryProvider({ name: 'store-x' });

    const eff1 = provider.prepare('KEY', 'val1')[0];
    const eff2 = provider.prepare('KEY', 'val2')[0];

    expect(() => provider.mergeSecrets([eff1, eff2])).toThrow(
      /Conflict detected: key "KEY" already exists in Secret "store-x"/
    );
  });
});
