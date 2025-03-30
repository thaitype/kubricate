import { describe, it, expect } from 'vitest';
import { InMemoryLoader } from './InMemoryLoader.js';

describe('InMemoryLoader', () => {
  it('loads a known secret and retrieves it', async () => {
    const loader = new InMemoryLoader({ SECRET_KEY: 'value123' });
    await loader.load(['SECRET_KEY']);
    expect(loader.get('SECRET_KEY')).toBe('value123');
  });

  it('throws if trying to get a secret before loading it', () => {
    const loader = new InMemoryLoader({ SECRET_KEY: 'value123' });
    expect(() => loader.get('SECRET_KEY')).toThrow('Secret SECRET_KEY not loaded');
  });

  it('throws if the secret does not exist in config', async () => {
    const loader = new InMemoryLoader({ SECRET_KEY: 'value123' });
    await expect(loader.load(['MISSING_KEY'])).rejects.toThrow('Missing secret: MISSING_KEY');
  });

  it('supports loading multiple keys at once', async () => {
    const loader = new InMemoryLoader({ A: '1', B: '2' });
    await loader.load(['A', 'B']);
    expect(loader.get('A')).toBe('1');
    expect(loader.get('B')).toBe('2');
  });
});
