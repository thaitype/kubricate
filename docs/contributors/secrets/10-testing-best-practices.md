# Testing & Best Practices

Effective testing ensures your secret management configuration is reliable and secure. This page covers testing strategies for connectors, providers, and orchestration.

## Testing Philosophy

Kubricate's secret system separates concerns for testability:

- **Unit tests** — Test connectors and providers in isolation
- **Integration tests** — Test SecretManager with real connectors and providers
- **Contract tests** — Verify custom components implement interfaces correctly
- **End-to-end tests** — Test full lifecycle from config to effects

## Unit Testing Connectors

### Pattern: Mock External Dependencies

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultConnector } from './VaultConnector';

describe('VaultConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load secret from Vault', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: { data: { password: 'secret-value' } },
        }),
      })
    );

    const connector = new VaultConnector({
      endpoint: 'https://vault.local',
      token: 'test-token',
      path: 'secret/data/test',
    });

    await connector.load(['DB_PASSWORD']);
    const value = connector.get('DB_PASSWORD');

    expect(value).toEqual({ password: 'secret-value' });
    expect(fetch).toHaveBeenCalledWith(
      'https://vault.local/v1/secret/data/test/DB_PASSWORD',
      expect.objectContaining({
        headers: { 'X-Vault-Token': 'test-token' },
      })
    );
  });

  it('should throw if secret does not exist', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })
    );

    const connector = new VaultConnector({
      endpoint: 'https://vault.local',
      token: 'test-token',
      path: 'secret/data/test',
    });

    await expect(connector.load(['MISSING'])).rejects.toThrow(
      'Failed to load secret "MISSING" from Vault'
    );
  });

  it('should throw if get() called before load()', () => {
    const connector = new VaultConnector({
      endpoint: 'https://vault.local',
      token: 'test-token',
      path: 'secret/data/test',
    });

    expect(() => connector.get('DB_PASSWORD')).toThrow(
      'Secret "DB_PASSWORD" not loaded. Did you call load()?'
    );
  });

  it('should cache loaded secrets', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: { data: { password: 'secret-value' } },
        }),
      })
    );

    const connector = new VaultConnector({
      endpoint: 'https://vault.local',
      token: 'test-token',
      path: 'secret/data/test',
    });

    await connector.load(['DB_PASSWORD']);
    connector.get('DB_PASSWORD');
    connector.get('DB_PASSWORD'); // Second call

    expect(fetch).toHaveBeenCalledTimes(1); // Only one fetch
  });
});
```

### Checklist: Connector Tests

- [ ] Load succeeds when secret exists
- [ ] Load throws when secret is missing
- [ ] Get throws when called before load
- [ ] Secrets are cached after load
- [ ] Structured values (JSON) are parsed correctly
- [ ] Error messages include context (name, path, source)
- [ ] Working directory is respected (if applicable)

## Unit Testing Providers

### Pattern: Test Prepare and Injection

```typescript
import { describe, it, expect } from 'vitest';
import { JwtSecretProvider } from './JwtSecretProvider';

describe('JwtSecretProvider', () => {
  it('should prepare JWT secret', () => {
    const provider = new JwtSecretProvider({ name: 'jwt-secret' });

    const effects = provider.prepare('AUTH_JWT', {
      token: 'eyJ...',
      publicKey: '-----BEGIN PUBLIC KEY-----',
    });

    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('kubectl');
    expect(effects[0].value.kind).toBe('Secret');
    expect(effects[0].value.metadata.name).toBe('jwt-secret');
    expect(effects[0].value.data).toHaveProperty('token');
    expect(effects[0].value.data).toHaveProperty('publicKey');
  });

  it('should throw if JWT format is invalid', () => {
    const provider = new JwtSecretProvider({ name: 'jwt-secret' });

    expect(() =>
      provider.prepare('AUTH_JWT', { invalid: 'data' })
    ).toThrow('JWT secret must contain "token" string');
  });

  it('should generate correct injection payload', () => {
    const provider = new JwtSecretProvider({ name: 'jwt-secret' });

    const payload = provider.getInjectionPayload([
      {
        providerId: 'jwt',
        provider,
        resourceId: 'deployment',
        path: 'spec.template.spec.containers[0].env',
        meta: {
          secretName: 'AUTH_JWT',
          targetName: 'JWT_TOKEN',
          strategy: { kind: 'env', key: 'token' },
        },
      },
    ]);

    expect(payload).toEqual([
      {
        name: 'JWT_TOKEN',
        valueFrom: {
          secretKeyRef: {
            name: 'jwt-secret',
            key: 'token',
          },
        },
      },
    ]);
  });

  it('should merge multiple effects', () => {
    const provider = new JwtSecretProvider({ name: 'jwt-secret' });

    const effect1 = provider.prepare('JWT1', {
      token: 'token1',
      publicKey: 'key1',
    })[0];

    const effect2 = provider.prepare('JWT2', {
      token: 'token2',
      publicKey: 'key2',
    })[0];

    const merged = provider.mergeSecrets([effect1, effect2]);

    expect(merged).toHaveLength(1);
    expect(Object.keys(merged[0].value.data)).toHaveLength(4); // 2 tokens + 2 keys
  });

  it('should return correct target path', () => {
    const provider = new JwtSecretProvider({ name: 'jwt-secret' });

    const path = provider.getTargetPath({ kind: 'env', containerIndex: 0 });
    expect(path).toBe('spec.template.spec.containers[0].env');

    const path2 = provider.getTargetPath({ kind: 'env', containerIndex: 1 });
    expect(path2).toBe('spec.template.spec.containers[1].env');
  });

  it('should return correct effect identifier', () => {
    const provider = new JwtSecretProvider({
      name: 'jwt-secret',
      namespace: 'production',
    });

    const effect = provider.prepare('AUTH_JWT', {
      token: 'eyJ...',
      publicKey: '-----BEGIN PUBLIC KEY-----',
    })[0];

    const identifier = provider.getEffectIdentifier(effect);
    expect(identifier).toBe('production/jwt-secret');
  });
});
```

### Checklist: Provider Tests

- [ ] Prepare creates valid effects
- [ ] Prepare validates secret structure
- [ ] Prepare throws on invalid format
- [ ] getInjectionPayload returns correct payload
- [ ] getInjectionPayload is pure (no side effects)
- [ ] getTargetPath returns correct JSONPath
- [ ] mergeSecrets combines effects correctly (if `allowMerge = true`)
- [ ] getEffectIdentifier returns unique ID

## Integration Testing

### Pattern: Test Full Manager Lifecycle

```typescript
import { describe, it, expect } from 'vitest';
import { SecretManager } from 'kubricate';
import { InMemoryConnector, InMemoryProvider } from 'kubricate';

describe('SecretManager Integration', () => {
  it('should load and prepare secrets', async () => {
    const connector = new InMemoryConnector({
      secrets: {
        DB_PASSWORD: 'postgres://localhost/mydb',
        API_KEY: 'secret-key',
      },
    });

    const provider = new InMemoryProvider({ name: 'test-provider' });

    const manager = new SecretManager()
      .addConnector('memory', connector)
      .addProvider('memory', provider)
      .addSecret({ name: 'DB_PASSWORD' })
      .addSecret({ name: 'API_KEY' });

    const effects = await manager.prepare();

    expect(effects).toHaveLength(2);
    expect(effects[0].name).toBe('DB_PASSWORD');
    expect(effects[1].name).toBe('API_KEY');
  });

  it('should throw if secret is missing', async () => {
    const connector = new InMemoryConnector({
      secrets: {
        DB_PASSWORD: 'postgres://localhost/mydb',
      },
    });

    const provider = new InMemoryProvider({ name: 'test-provider' });

    const manager = new SecretManager()
      .addConnector('memory', connector)
      .addProvider('memory', provider)
      .addSecret({ name: 'DB_PASSWORD' })
      .addSecret({ name: 'MISSING_SECRET' }); // ❌

    await expect(manager.prepare()).rejects.toThrow(
      'Secret "MISSING_SECRET" not loaded'
    );
  });

  it('should validate configuration', () => {
    const manager = new SecretManager()
      .addConnector('memory', new InMemoryConnector({ secrets: {} }));
    // No provider added

    expect(() => manager.build()).toThrow(
      'At least one provider must be registered'
    );
  });
});
```

## End-to-End Testing

### Pattern: Test Orchestration

```typescript
import { describe, it, expect } from 'vitest';
import { SecretsOrchestrator } from 'kubricate';
import { EnvConnector } from '@kubricate/plugin-env';
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes';

describe('Secrets Orchestration E2E', () => {
  it('should validate and apply secrets', async () => {
    process.env.KUBRICATE_SECRET_DB_PASSWORD = 'postgres://localhost/mydb';
    process.env.KUBRICATE_SECRET_API_KEY = 'secret-key';

    const manager = new SecretManager()
      .addConnector('env', new EnvConnector())
      .addProvider('opaque', new OpaqueSecretProvider({ name: 'app-secret' }))
      .addSecret({ name: 'DB_PASSWORD' })
      .addSecret({ name: 'API_KEY' });

    const orchestrator = SecretsOrchestrator.create({
      managers: [manager],
    });

    // Validate
    await expect(orchestrator.validate()).resolves.toBeDefined();

    // Apply
    const effects = await orchestrator.apply();

    expect(effects).toHaveLength(1); // Merged into one
    expect(effects[0].type).toBe('kubectl');
    expect(effects[0].value.kind).toBe('Secret');
    expect(effects[0].value.data).toHaveProperty('DB_PASSWORD');
    expect(effects[0].value.data).toHaveProperty('API_KEY');
  });

  it('should detect conflicts', async () => {
    process.env.KUBRICATE_SECRET_PASSWORD = 'secret';
    process.env.KUBRICATE_SECRET_CREDS = 'creds';

    const manager = new SecretManager()
      .addConnector('env', new EnvConnector())
      .addProvider('opaque', new OpaqueSecretProvider({ name: 'app-secret' }))
      .addProvider('basic', new BasicAuthSecretProvider({ name: 'app-secret' })) // ❌ Same name
      .addSecret({ name: 'PASSWORD', provider: 'opaque' })
      .addSecret({ name: 'CREDS', provider: 'basic' });

    const orchestrator = SecretsOrchestrator.create({
      managers: [manager],
      config: {
        conflict: { strategies: { crossProvider: 'error' } },
      },
    });

    await expect(orchestrator.apply()).rejects.toThrow(
      'Duplicate resource identifier'
    );
  });
});
```

## Best Practices

### Testing Do's and Don'ts

| ✅ Do | ❌ Don't |
|-------|----------|
| Mock external dependencies (Vault, AWS) | Test against real services in unit tests |
| Test error paths (missing secrets, invalid format) | Only test happy path |
| Use InMemoryConnector/Provider for integration | Use EnvConnector in unit tests |
| Verify error messages are clear | Skip error message assertions |
| Test merge behavior explicitly | Assume merge always works |

### Connector Testing

| ✅ Do | ❌ Don't |
|-------|----------|
| Test load() success and failure | Skip validation tests |
| Test get() before load() throws | Assume caching works |
| Verify error messages include context | Use generic errors |
| Mock external APIs (fetch, SDK calls) | Make real network calls |
| Test working directory handling | Hard-code paths in tests |

### Provider Testing

| ✅ Do | ❌ Don't |
|-------|----------|
| Test prepare() with valid and invalid inputs | Skip structure validation |
| Test getInjectionPayload() returns correct shape | Assume payload is always valid |
| Test mergeSecrets() combines effects correctly | Skip merge tests |
| Verify getEffectIdentifier() is unique | Use vague identifiers |
| Test all supported strategies | Test only one strategy |

### Orchestration Testing

| ✅ Do | ❌ Don't |
|-------|----------|
| Test conflict detection | Assume conflicts are caught |
| Test merge strategies (autoMerge, error, overwrite) | Only test autoMerge |
| Test cross-manager scenarios | Only test single manager |
| Verify final effects are correct | Skip effect validation |
| Test strict mode separately | Mix strict and normal tests |

## Test Structure

### Recommended Organization

```
packages/
├── my-connector/
│   ├── src/
│   │   └── MyConnector.ts
│   └── tests/
│       ├── MyConnector.test.ts       # Unit tests
│       └── integration.test.ts       # Integration tests
│
├── my-provider/
│   ├── src/
│   │   └── MyProvider.ts
│   └── tests/
│       ├── MyProvider.test.ts        # Unit tests
│       ├── merge.test.ts             # Merge behavior
│       └── injection.test.ts         # Injection payloads
```

### Test Naming

Use descriptive test names:

```typescript
// ✓ Good
it('should throw if secret does not exist in Vault');
it('should merge multiple JWT secrets into one effect');
it('should detect cross-provider conflict and throw error');

// ✗ Bad
it('should work');
it('test load');
it('error case');
```

## CI Integration

### Fast Tests

Run unit tests on every commit:

```bash
pnpm test
```

### Coverage

Aim for high coverage on critical paths:

```bash
pnpm test:coverage
```

**Target coverage:**
- Connectors: 90%+ (simple logic)
- Providers: 85%+ (validation + merge)
- Orchestration: 80%+ (complex flow)

### Slow Tests

Run integration/E2E tests on PR merge:

```bash
pnpm test:integration
```

## Debugging Tests

### Enable Debug Logging

```typescript
import { ConsoleLogger } from '@kubricate/core';

const connector = new VaultConnector({
  endpoint: 'https://vault.local',
  token: 'test-token',
  path: 'secret/data/test',
  logger: new ConsoleLogger('debug'),
});
```

### Inspect Effects

```typescript
const effects = await orchestrator.apply();
console.log(JSON.stringify(effects, null, 2));
```

### Verify Merge Behavior

```typescript
const provider = new OpaqueSecretProvider({ name: 'test-secret' });

const effect1 = provider.prepare('DB_PASSWORD', 'pass1')[0];
const effect2 = provider.prepare('API_KEY', 'key1')[0];

console.log('Before merge:', [effect1, effect2]);

const merged = provider.mergeSecrets([effect1, effect2]);

console.log('After merge:', merged);
```

## Summary

Effective testing ensures:

- **Reliability** — Secrets load correctly from all sources
- **Validation** — Invalid formats are caught early
- **Merging** — Conflicts are resolved as expected
- **Security** — Error messages don't leak secret values

Follow these patterns and your secret management will be production-ready.

## What You've Learned

Congratulations! You've completed the Kubricate secret management guide. You now understand:

- The four-layer architecture (External Sources, Plugin Layer, Orchestration, Output)
- The full secret lifecycle (Configure → Validate → Prepare → Merge → Execute)
- Core concepts (Connector, Provider, SecretManager, SecretsOrchestrator)
- How to implement custom connectors and providers
- How to test your secret management configuration

## Related Documentation

- [Architecture Overview](../architecture-overview.md) — Full system context
- [Generate Workflow](../generate-workflow.md) — How stacks and resources are composed
- [Command Flows](../command-flows.md) — CLI command execution details
