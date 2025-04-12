import { describe, it, expect } from 'vitest';
import { InMemoryConnector } from './InMemoryConnector.js';

describe('InMemoryConnector', () => {
  it('loads a known secret and retrieves it', async () => {
    const connector = new InMemoryConnector({ SECRET_KEY: 'value123' });
    await connector.load(['SECRET_KEY']);
    expect(connector.get('SECRET_KEY')).toBe('value123');
  });

  it('throws if trying to get a secret before loading it', () => {
    const connector = new InMemoryConnector({ SECRET_KEY: 'value123' });
    expect(() => connector.get('SECRET_KEY')).toThrow('Secret SECRET_KEY not loaded');
  });

  it('throws if the secret does not exist in config', async () => {
    const connector = new InMemoryConnector({ SECRET_KEY: 'value123' });
    await expect(connector.load(['MISSING_KEY'])).rejects.toThrow('Missing secret: MISSING_KEY');
  });

  it('supports loading multiple keys at once', async () => {
    const connector = new InMemoryConnector({ A: '1', B: '2' });
    await connector.load(['A', 'B']);
    expect(connector.get('A')).toBe('1');
    expect(connector.get('B')).toBe('2');
  });
});
