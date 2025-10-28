# Extensibility

Kubricate's plugin system lets you add custom connectors and providers without modifying core code. This page shows you how to build your own.

## When to Build Custom Components

### Build a Custom Connector When:

- Your organization uses a secret backend not yet supported (Vault, AWS, Azure, 1Password)
- You need to load secrets from a custom API or database
- You want to implement caching or fallback logic

### Build a Custom Provider When:

- You need a Kubernetes Secret type not yet supported (SAML, SSH, certificate)
- You want custom validation rules for secret structure
- You need a new injection strategy (volume mount, annotation, Helm values)

## Custom Connector Example: Vault

This example shows a minimal HashiCorp Vault connector.

### Step 1: Define Configuration

```typescript
import type { BaseConnector, SecretValue } from '@kubricate/core';

interface VaultConnectorConfig {
  endpoint: string;   // Vault API endpoint
  token: string;      // Authentication token
  path: string;       // Base path for secrets
}
```

### Step 2: Implement Interface

```typescript
export class VaultConnector implements BaseConnector<VaultConnectorConfig> {
  private secrets = new Map<string, SecretValue>();

  constructor(public config: VaultConnectorConfig) {}

  async load(names: string[]): Promise<void> {
    for (const name of names) {
      const secretPath = `${this.config.path}/${name}`;

      try {
        const response = await fetch(
          `${this.config.endpoint}/v1/${secretPath}`,
          {
            headers: {
              'X-Vault-Token': this.config.token,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        this.secrets.set(name, json.data.data);
      } catch (error) {
        throw new Error(
          `Failed to load secret "${name}" from Vault at ${secretPath}: ${error.message}`
        );
      }
    }
  }

  get(name: string): SecretValue {
    if (!this.secrets.has(name)) {
      throw new Error(`Secret "${name}" not loaded. Did you call load()?`);
    }
    return this.secrets.get(name)!;
  }
}
```

### Step 3: Use in Configuration

```typescript
import { VaultConnector } from './VaultConnector';

const manager = new SecretManager()
  .addConnector('vault', new VaultConnector({
    endpoint: 'https://vault.example.com',
    token: process.env.VAULT_TOKEN!,
    path: 'secret/data/myapp',
  }))
  .addProvider('opaque', new OpaqueSecretProvider({ name: 'app-secret' }))
  .addSecret({ name: 'DB_PASSWORD', connector: 'vault' });
```

### Step 4: Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { VaultConnector } from './VaultConnector';

describe('VaultConnector', () => {
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
});
```

## Custom Provider Example: JWT

This example shows a provider for JWT secrets with structured validation.

### Step 1: Define Configuration

```typescript
import { Base64 } from 'js-base64';
import type {
  BaseProvider,
  PreparedEffect,
  ProviderInjection,
  SecretInjectionStrategy,
} from '@kubricate/core';

interface JwtSecretProviderConfig {
  name: string;
  namespace?: string;
}
```

### Step 2: Implement Interface

```typescript
export class JwtSecretProvider implements BaseProvider<JwtSecretProviderConfig, 'env'> {
  readonly allowMerge = true;
  readonly targetKind = 'Deployment';
  readonly supportedStrategies = ['env'] as const;
  readonly supportedEnvKeys = ['token', 'publicKey'] as const;

  name: string | undefined;

  constructor(public config: JwtSecretProviderConfig) {}

  prepare(name: string, value: unknown): PreparedEffect[] {
    // Validate structure
    if (typeof value !== 'object' || value === null) {
      throw new Error(`JWT secret must be an object with 'token' and 'publicKey'`);
    }

    const jwt = value as Record<string, unknown>;

    if (!jwt.token || typeof jwt.token !== 'string') {
      throw new Error('JWT secret must contain "token" string');
    }

    if (!jwt.publicKey || typeof jwt.publicKey !== 'string') {
      throw new Error('JWT secret must contain "publicKey" string');
    }

    return [{
      type: 'kubectl',
      secretName: name,
      providerName: this.name,
      value: {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: this.config.name,
          namespace: this.config.namespace ?? 'default',
        },
        type: 'Opaque',
        data: {
          token: Base64.encode(jwt.token),
          publicKey: Base64.encode(jwt.publicKey),
        },
      },
    }];
  }

  getInjectionPayload(injectes: ProviderInjection[]): unknown {
    return injectes.map(inject => {
      const name = inject.meta?.targetName ?? inject.meta?.secretName;
      const strategy = inject.meta?.strategy;

      if (strategy?.kind !== 'env') {
        throw new Error('JWT secrets only support "env" injection');
      }

      const key = strategy.key;
      if (!key || !['token', 'publicKey'].includes(key)) {
        throw new Error(`Invalid key for JWT secret: ${key}`);
      }

      return {
        name,
        valueFrom: {
          secretKeyRef: {
            name: this.config.name,
            key,
          },
        },
      };
    });
  }

  getTargetPath(strategy: SecretInjectionStrategy): string {
    if (strategy.kind === 'env') {
      const index = strategy.containerIndex ?? 0;
      return `spec.template.spec.containers[${index}].env`;
    }
    throw new Error(`Unsupported strategy: ${strategy.kind}`);
  }

  getEffectIdentifier(effect: PreparedEffect): string {
    const meta = effect.value?.metadata ?? {};
    return `${meta.namespace ?? 'default'}/${meta.name}`;
  }

  mergeSecrets(effects: PreparedEffect[]): PreparedEffect[] {
    const merged: Record<string, string> = {};

    for (const effect of effects) {
      const data = effect.value?.data ?? {};
      Object.assign(merged, data);
    }

    return [{
      ...effects[0],
      value: {
        ...effects[0].value,
        data: merged,
      },
    }];
  }
}
```

### Step 3: Use in Configuration

```typescript
const manager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('jwt', new JwtSecretProvider({ name: 'jwt-secret' }))
  .addSecret({ name: 'AUTH_JWT', provider: 'jwt' });
```

**Environment:**
```bash
KUBRICATE_SECRET_AUTH_JWT='{"token":"eyJ...","publicKey":"-----BEGIN PUBLIC KEY-----"}'
```

**Stack injection:**
```typescript
stack.useSecrets(manager, c => {
  c.secrets('AUTH_JWT')
    .forName('JWT_TOKEN')
    .inject('env', { key: 'token' });

  c.secrets('AUTH_JWT')
    .forName('JWT_PUBLIC_KEY')
    .inject('env', { key: 'publicKey' });
});
```

### Step 4: Test

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
    expect(effects[0].value.data).toHaveProperty('token');
    expect(effects[0].value.data).toHaveProperty('publicKey');
  });

  it('should throw if JWT format is invalid', () => {
    const provider = new JwtSecretProvider({ name: 'jwt-secret' });

    expect(() =>
      provider.prepare('AUTH_JWT', { invalid: 'data' })
    ).toThrow('JWT secret must contain "token" string');
  });

  it('should merge multiple JWT secrets', () => {
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
    expect(merged[0].value.data).toEqual({
      token: expect.any(String),
      publicKey: expect.any(String),
    });
  });
});
```

## Best Practices

### For Connectors

| ✅ Do | ❌ Don't |
|-------|----------|
| Cache loaded secrets internally | Fetch on every `get()` call |
| Throw descriptive errors | Return `undefined` or `null` |
| Validate in `load()`, not `get()` | Defer validation |
| Support structured values (JSON) | Force string-only values |
| Implement `setWorkingDir` for files | Hard-code paths |

### For Providers

| ✅ Do | ❌ Don't |
|-------|----------|
| Validate structure in `prepare()` | Skip validation |
| Set `allowMerge` appropriately | Default to `true` for incompatible types |
| Implement `getEffectIdentifier()` | Use vague identifiers |
| Support multiple strategies | Hard-code single strategy |
| Make `getInjectionPayload()` pure | Perform side effects |

## Connector Checklist

When implementing a custom connector:

- [ ] Implement `load(names)` to fetch all secrets upfront
- [ ] Implement `get(name)` to return cached values
- [ ] Throw if a requested secret is missing
- [ ] Store loaded secrets in a `Map<string, SecretValue>`
- [ ] Parse values appropriately (JSON, strings, etc.)
- [ ] Provide clear error messages with context
- [ ] Implement `setWorkingDir` if reading from files
- [ ] Add logger support for debugging
- [ ] Write unit tests for success and error cases
- [ ] Document configuration options

## Provider Checklist

When implementing a custom provider:

- [ ] Implement `prepare(name, value)` to create effects
- [ ] Implement `getInjectionPayload(injectes)` for Stack injection
- [ ] Implement `getTargetPath(strategy)` to return JSONPath
- [ ] Set `targetKind` to Kubernetes resource type
- [ ] Set `supportedStrategies` array
- [ ] Set `supportedEnvKeys` for structured secrets
- [ ] Validate secret structure in `prepare()`
- [ ] Set `allowMerge` based on compatibility
- [ ] Implement `mergeSecrets()` if `allowMerge = true`
- [ ] Implement `getEffectIdentifier()` for conflict detection
- [ ] Write unit tests for prepare, merge, and validation
- [ ] Document supported strategies and configuration

## Type Safety with supportedEnvKeys

For structured secrets, define allowed keys:

```typescript
export class VendorApiProvider implements BaseProvider<Config, 'env', 'api_key' | 'endpoint'> {
  readonly supportedEnvKeys = ['api_key', 'endpoint'] as const;

  prepare(name: string, value: unknown): PreparedEffect[] {
    // TypeScript ensures value has 'api_key' and 'endpoint'
    // Runtime validation reinforces type safety
    if (!this.isValidStructure(value)) {
      throw new Error('Invalid structure');
    }
    // ...
  }
}
```

**Benefits:**
- TypeScript validates key references at compile time
- Runtime validation catches unexpected keys
- Clear documentation of expected structure

## Packaging Custom Components

### As a Standalone Package

```
my-kubricate-vault/
├── package.json
├── src/
│   ├── VaultConnector.ts
│   └── index.ts
├── dist/
└── README.md
```

**package.json:**
```json
{
  "name": "@myorg/kubricate-vault",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "@kubricate/core": "^0.x"
  }
}
```

**Usage:**
```typescript
import { VaultConnector } from '@myorg/kubricate-vault';
```

### As Part of Your Project

```
my-project/
├── kubricate.config.ts
├── src/
│   └── connectors/
│       └── VaultConnector.ts
```

**Usage:**
```typescript
import { VaultConnector } from './src/connectors/VaultConnector';
```

## Advanced: Custom Effect Types

For non-kubectl effects, define custom types:

```typescript
interface HelmEffect {
  type: 'helm';
  chart: string;
  values: Record<string, unknown>;
}

export class HelmSecretsProvider implements BaseProvider<Config> {
  prepare(name: string, value: SecretValue): HelmEffect[] {
    return [{
      type: 'helm',
      chart: 'stable/secrets',
      values: { [name]: value },
    }];
  }
}
```

**Note:** Custom effects require custom executors in the CLI layer.

## What's Next

Now that you can extend Kubricate, let's explore testing strategies for your custom components.

**Next →** [Testing & Best Practices](./10-testing-best-practices.md)

**Related:**
- [Connectors](./04-connectors.md) — BaseConnector interface details
- [Providers](./05-providers.md) — BaseProvider interface details
- [Core Concepts](./03-core-concepts.md) — Type system overview
