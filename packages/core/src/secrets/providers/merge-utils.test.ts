import { describe, it, expect } from 'vitest';
import { createMergeHandler } from './merge-utils.js';
import type { PreparedEffect } from './BaseProvider.js';

describe('createMergeHandler', () => {
  const merge = createMergeHandler();

  const baseEffect = (storeName: string, rawData: Record<string, string>): PreparedEffect => ({
    providerName: 'InMemory',
    type: 'custom',
    value: {
      storeName,
      rawData,
    },
  });

  it('should merge effects with different storeNames separately', () => {
    const effects: PreparedEffect[] = [
      baseEffect('secret-a', { KEY1: 'VAL1' }),
      baseEffect('secret-b', { KEY2: 'VAL2' }),
    ];

    const result = merge(effects);
    expect(result).toHaveLength(2);
    expect(result[0].value.rawData).toEqual({ KEY1: 'VAL1' });
    expect(result[1].value.rawData).toEqual({ KEY2: 'VAL2' });
  });

  it('should merge effects with same storeName and different keys', () => {
    const effects: PreparedEffect[] = [
      baseEffect('shared-secret', { FOO: 'BAR' }),
      baseEffect('shared-secret', { BAZ: 'QUX' }),
    ];

    const result = merge(effects);
    expect(result).toHaveLength(1);
    expect(result[0].value.rawData).toEqual({ FOO: 'BAR', BAZ: 'QUX' });
  });

  it('should throw on duplicate keys within same storeName', () => {
    const effects: PreparedEffect[] = [
      baseEffect('dup-secret', { KEY: 'VAL1' }),
      baseEffect('dup-secret', { KEY: 'VAL2' }),
    ];

    expect(() => merge(effects)).toThrowError(
      '[merge:in-memory] Conflict detected: key "KEY" already exists in Secret "dup-secret"'
    );
  });

  it('should skip effects not of type "custom"', () => {
    const nonCustom = {
      providerName: 'InMemory',
      type: 'something-else' as string,
      value: {},
    } as PreparedEffect;

    const result = merge([
      nonCustom,
      baseEffect('valid', { K: 'V' }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].value.storeName).toBe('valid');
    expect(result[0].value.rawData).toEqual({ K: 'V' });
  });
});
