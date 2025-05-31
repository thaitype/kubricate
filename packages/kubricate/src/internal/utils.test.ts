import { describe, it, expect } from 'vitest';
import { validateString, getClassName } from './utils.js'; // adjust the import path if needed

describe('validateString', () => {
  it('should not throw for string values', () => {
    expect(() => validateString('hello')).not.toThrow();
  });

  it('should throw TypeError for non-string values', () => {
    const invalidValues = [42, true, null, undefined, {}, [], () => {}];

    for (const value of invalidValues) {
      expect(() => validateString(value)).toThrowError(TypeError);
      expect(() => validateString(value)).toThrowError(/Expected a string, but received:/);
    }
  });
});

describe('getClassName', () => {
  it('should return constructor name for object instances', () => {
    class MyClass {}
    const instance = new MyClass();

    expect(getClassName(instance)).toBe('MyClass');
    expect(getClassName([])).toBe('Array');
    expect(getClassName({})).toBe('Object');
    expect(getClassName(new Date())).toBe('Date');
  });

  it('should return "Unknown" for primitives and null/undefined', () => {
    expect(getClassName(null)).toBe('Unknown');
    expect(getClassName(undefined)).toBe('Unknown');
    expect(getClassName('string')).toBe('Unknown');
    expect(getClassName(123)).toBe('Unknown');
    expect(getClassName(true)).toBe('Unknown');
  });
});
