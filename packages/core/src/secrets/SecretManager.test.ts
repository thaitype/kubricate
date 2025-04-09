// SecretManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SecretManager } from './SecretManager.js';
import { InMemoryLoader } from './loaders/InMemoryLoader.js';
import { InMemoryProvider } from './providers/InMemoryProvider.js';

describe('SecretManager', () => {
  let manager: SecretManager;

  beforeEach(() => {
    manager = new SecretManager();
  });

  it('throws if no loader or provider is registered', () => {
    expect(() => manager.build()).toThrow('No loaders registered');
  });

  it('adds and retrieves a loader and provider', () => {
    manager = manager.addLoader('memory', new InMemoryLoader({})) as SecretManager;
    manager = manager.addProvider('kube', new InMemoryProvider({ name: 'my-secret' })) as SecretManager;
    expect(() => manager.build()).toThrow('No secrets registered');
  });

  it('adds a secret with full options object', () => {
    manager = manager
      .addLoader('memory', new InMemoryLoader({ DB_PASS: 'pw' }))
      .addProvider('kube', new InMemoryProvider({ name: 'secret' }))
      .setDefaultLoader('memory')
      .setDefaultProvider('kube')
      .addSecret({ name: 'DB_PASS', loader: 'memory', provider: 'kube' }) as SecretManager;

    expect(() => manager.build()).not.toThrow();
  });

  it('adds a secret and prepares it', async () => {
    manager = manager
      .addLoader('memory', new InMemoryLoader({ API_KEY: '12345' }))
      .addProvider('kube', new InMemoryProvider({ name: 'my-secret' }))
      .setDefaultLoader('memory')
      .setDefaultProvider('kube')
      .addSecret('API_KEY') as SecretManager;

    const result = await manager.prepare();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('API_KEY');
    expect(result[0].value).toBe('12345');
    expect(Array.isArray(result[0].effects)).toBe(true);
  });

  it('throws if loader or provider does not exist', () => {
    manager = manager.addLoader('valid', new InMemoryLoader({})) as SecretManager;

    expect(() => manager.getLoader('not-exist')).toThrow('Loader not-exist not found');
    expect(() => manager.getProvider('not-exist')).toThrow('Provider not-exist not found');
  });

  it('prevents duplicate loader, provider, and secret', () => {
    manager = manager.addLoader('memory', new InMemoryLoader({})) as SecretManager;
    expect(() => manager.addLoader('memory', new InMemoryLoader({}))).toThrow('Loader memory already exists');

    manager = manager.addProvider('kube', new InMemoryProvider({ name: 'my-secret' })) as SecretManager;
    expect(() => manager.addProvider('kube', new InMemoryProvider({ name: 'my-secret' }))).toThrow(
      'Provider kube already exists'
    );

    manager = manager.addSecret('DUPLICATE_SECRET');
    expect(() => manager.addSecret('DUPLICATE_SECRET')).toThrow('Secret DUPLICATE_SECRET already exists');
  });

  it('auto-assigns default loader/provider when only one is registered', async () => {
    manager = manager
      .addLoader('memory', new InMemoryLoader({ AUTO: 'ok' }))
      .addProvider('kube', new InMemoryProvider({ name: 'auto-secret' }))
      .addSecret('AUTO') as SecretManager;

    const result = await manager.prepare();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('AUTO');
    expect(result[0].value).toBe('ok');
  });

  it('throws when only secrets exist but no providers or loaders', () => {
    manager = manager.addSecret('MISSING_BACKENDS');
    expect(() => manager.build()).toThrow('No loaders registered');
  });

  it('throws when multiple providers but no default set', () => {
    manager = manager
      .addLoader('memory', new InMemoryLoader({ X: '1' }))
      .addProvider('kube1', new InMemoryProvider({ name: 's1' }))
      .addProvider('kube2', new InMemoryProvider({ name: 's2' }))
      .addSecret('X') as SecretManager;

    expect(() => manager.build()).toThrow('No default provider set, and multiple providers registered');
  });

  it('throws when multiple loaders but no default set', () => {
    manager = manager
      .addLoader('m1', new InMemoryLoader({ Y: '2' }))
      .addLoader('m2', new InMemoryLoader({ Y: '2' }))
      .addProvider('kube', new InMemoryProvider({ name: 's' }))
      .addSecret('Y') as SecretManager;

    expect(() => manager.build()).toThrow('No default loader set, and multiple loaders registered');
  });

  it('throws when adding duplicate secret via object form', () => {
    manager = manager
      .addLoader('memory', new InMemoryLoader({}))
      .addProvider('kube', new InMemoryProvider({ name: 'my-secret' }))
      .setDefaultLoader('memory')
      .setDefaultProvider('kube')
      .addSecret({ name: 'DB_PASSWORD', loader: 'memory', provider: 'kube' }) as SecretManager;

    expect(() =>
      // Attempting to add the same secret again
      manager.addSecret({ name: 'DB_PASSWORD' })
    ).toThrow('Secret DB_PASSWORD already exists');
  });

  it('throws when no providers are registered', () => {
    manager = manager
      .addLoader('memory', new InMemoryLoader({ MY_TOKEN: 'secure' }))
      .addSecret('MY_TOKEN') as SecretManager;

    expect(() => manager.build()).toThrow('No providers registered');
  });
});
