import { describe, it, expect } from 'vitest';

import { maskingValue } from './utilts.js'; // Replace with actual path

describe('maskingValue', () => {
  it('masks all characters after default length (4)', () => {
    const result = maskingValue('1234567890');
    expect(result).toBe('1234******');
  });

  it('masks after custom length', () => {
    const result = maskingValue('abcdef', 2);
    expect(result).toBe('ab****');
  });

  it('returns original string if value length <= length', () => {
    const result = maskingValue('abc', 5);
    expect(result).toBe('abc**'); // no mask
  });

  it('returns empty string if input is empty', () => {
    const result = maskingValue('');
    expect(result).toBe('****');
  });

  it('throws error for negative length', () => {
    expect(() => maskingValue('abc', -1)).toThrow('Length must be a non-negative integer');
  });
});
