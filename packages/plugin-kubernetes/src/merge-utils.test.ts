/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import { createKubernetesMergeHandler } from './merge-utils.js';

describe('createKubernetesMergeHandler', () => {
  const merge = createKubernetesMergeHandler();

  it('merges secrets with different keys into one Secret', () => {
    const effects = [
      {
        providerName: 'provider1',
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'my-secret', namespace: 'default' },
          type: 'Opaque',
          data: { API_KEY: 'abc123' },
        },
      },
      {
        providerName: 'provider2',
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'my-secret', namespace: 'default' },
          type: 'Opaque',
          data: { DB_PASS: 'xyz789' },
        },
      },
    ];

    const merged = merge(effects);

    expect(merged).toHaveLength(1);
    expect(merged[0].value.data).toEqual({
      API_KEY: 'abc123',
      DB_PASS: 'xyz789',
    });
  });

  it('throws on duplicate key within the same Secret', () => {
    const effects = [
      {
        providerName: 'provider1',
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'dup-secret', namespace: 'default' },
          type: 'Opaque',
          data: { SHARED_KEY: 'value1' },
        },
      },
      {
        providerName: 'provider2',
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'dup-secret', namespace: 'default' },
          type: 'Opaque',
          data: { SHARED_KEY: 'value2' },
        },
      },
    ];

    expect(() => merge(effects)).toThrowError(
      '[conflict:k8s] Conflict detected: key "SHARED_KEY" already exists in Secret "dup-secret" in namespace "default"'
    );
  });

  it('handles multiple namespaces separately', () => {
    const effects = [
      {
        providerName: 'provider1',
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'my-secret', namespace: 'ns1' },
          type: 'Opaque',
          data: { KEY1: 'val1' },
        },
      },
      {
        providerName: 'provider2',
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'my-secret', namespace: 'ns2' },
          type: 'Opaque',
          data: { KEY1: 'val2' },
        },
      },
    ];

    const merged = merge(effects);
    expect(merged).toHaveLength(2);
    expect(merged.find(m => m.value.metadata.namespace === 'ns1')?.value.data).toEqual({ KEY1: 'val1' });
    expect(merged.find(m => m.value.metadata.namespace === 'ns2')?.value.data).toEqual({ KEY1: 'val2' });
  });

  it('skips non-kubectl effects', () => {
    const effects = [
      {
        providerName: 'provider1',
        type: 'custom' as any,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'my-secret', namespace: 'default' },
          type: 'Opaque',
          data: { KEY1: 'val1' },
        },
      },
      {
        providerName: 'provider2',
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'my-secret', namespace: 'default' },
          type: 'Opaque',
          data: { KEY2: 'val2' },
        },
      },
    ];

    const merged = merge(effects);
    expect(merged).toHaveLength(1);
    expect(merged[0].value.data).toEqual({ KEY2: 'val2' });
  });

  it('skips non-Secret kinds', () => {
    const effects = [
      {
        providerName: 'provider1',
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: 'my-config', namespace: 'default' },
          data: { KEY1: 'val1' },
        },
      },
      {
        providerName: 'provider2',
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'my-secret', namespace: 'default' },
          type: 'Opaque',
          data: { KEY2: 'val2' },
        },
      },
    ];

    const merged = merge(effects);
    expect(merged).toHaveLength(1);
    expect(merged[0].value.data).toEqual({ KEY2: 'val2' });
  });
});
