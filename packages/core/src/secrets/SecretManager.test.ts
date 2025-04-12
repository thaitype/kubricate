// SecretManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SecretManager } from './SecretManager.js';
import { InMemoryConnector } from './connectors/InMemoryConnector.js';
import { InMemoryProvider } from './providers/InMemoryProvider.js';

describe('SecretManager', () => {
  let manager: SecretManager;

  beforeEach(() => {
    manager = new SecretManager();
  });

  it('throws if no connector or provider is registered', () => {
    expect(() => manager.build()).toThrow('No connectors registered');
  });

  it('adds and retrieves a connector and provider', () => {
    manager = manager.addConnector('memory', new InMemoryConnector({})) as SecretManager;
    manager = manager.addProvider('kube', new InMemoryProvider({ name: 'my-secret' })) as SecretManager;
    expect(() => manager.build()).toThrow('No secrets registered');
  });

  it('adds a secret with full options object', () => {
    manager = manager
      .addConnector('memory', new InMemoryConnector({ DB_PASS: 'pw' }))
      .addProvider('kube', new InMemoryProvider({ name: 'secret' }))
      .setDefaultConnector('memory')
      .setDefaultProvider('kube')
      .addSecret({ name: 'DB_PASS', connector: 'memory', provider: 'kube' }) as SecretManager;

    expect(() => manager.build()).not.toThrow();
  });

  it('adds a secret and prepares it', async () => {
    manager = manager
      .addConnector('memory', new InMemoryConnector({ API_KEY: '12345' }))
      .addProvider('kube', new InMemoryProvider({ name: 'my-secret' }))
      .setDefaultConnector('memory')
      .setDefaultProvider('kube')
      .addSecret('API_KEY') as SecretManager;

    const result = await manager.prepare();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('API_KEY');
    expect(result[0].value).toBe('12345');
    expect(Array.isArray(result[0].effects)).toBe(true);
  });

  it('throws if connector or provider does not exist', () => {
    manager = manager.addConnector('valid', new InMemoryConnector({})) as SecretManager;

    expect(() => manager.getConnector('not-exist')).toThrow('Connector not-exist not found');
    expect(() => manager.getProvider('not-exist')).toThrow('Provider not-exist not found');
  });

  it('prevents duplicate connector, provider, and secret', () => {
    manager = manager.addConnector('memory', new InMemoryConnector({})) as SecretManager;
    expect(() => manager.addConnector('memory', new InMemoryConnector({}))).toThrow('Connector memory already exists');

    manager = manager.addProvider('kube', new InMemoryProvider({ name: 'my-secret' })) as SecretManager;
    expect(() => manager.addProvider('kube', new InMemoryProvider({ name: 'my-secret' }))).toThrow(
      'Provider kube already exists'
    );

    manager = manager.addSecret('DUPLICATE_SECRET');
    expect(() => manager.addSecret('DUPLICATE_SECRET')).toThrow('Secret DUPLICATE_SECRET already exists');
  });

  it('auto-assigns default connector/provider when only one is registered', async () => {
    manager = manager
      .addConnector('memory', new InMemoryConnector({ AUTO: 'ok' }))
      .addProvider('kube', new InMemoryProvider({ name: 'auto-secret' }))
      .addSecret('AUTO') as SecretManager;

    const result = await manager.prepare();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('AUTO');
    expect(result[0].value).toBe('ok');
  });

  it('throws when only secrets exist but no providers or connectors', () => {
    manager = manager.addSecret('MISSING_BACKENDS');
    expect(() => manager.build()).toThrow('No connectors registered');
  });

  it('throws when multiple providers but no default set', () => {
    manager = manager
      .addConnector('memory', new InMemoryConnector({ X: '1' }))
      .addProvider('kube1', new InMemoryProvider({ name: 's1' }))
      .addProvider('kube2', new InMemoryProvider({ name: 's2' }))
      .addSecret('X') as SecretManager;

    expect(() => manager.build()).toThrow('No default provider set, and multiple providers registered');
  });

  it('throws when multiple connectors but no default set', () => {
    manager = manager
      .addConnector('m1', new InMemoryConnector({ Y: '2' }))
      .addConnector('m2', new InMemoryConnector({ Y: '2' }))
      .addProvider('kube', new InMemoryProvider({ name: 's' }))
      .addSecret('Y') as SecretManager;

    expect(() => manager.build()).toThrow('No default connector set, and multiple connectors registered');
  });

  it('throws when adding duplicate secret via object form', () => {
    manager = manager
      .addConnector('memory', new InMemoryConnector({}))
      .addProvider('kube', new InMemoryProvider({ name: 'my-secret' }))
      .setDefaultConnector('memory')
      .setDefaultProvider('kube')
      .addSecret({ name: 'DB_PASSWORD', connector: 'memory', provider: 'kube' }) as SecretManager;

    expect(() =>
      // Attempting to add the same secret again
      manager.addSecret({ name: 'DB_PASSWORD' })
    ).toThrow('Secret DB_PASSWORD already exists');
  });

  it('throws when no providers are registered', () => {
    manager = manager
      .addConnector('memory', new InMemoryConnector({ MY_TOKEN: 'secure' }))
      .addSecret('MY_TOKEN') as SecretManager;

    expect(() => manager.build()).toThrow('No providers registered');
  });
});
