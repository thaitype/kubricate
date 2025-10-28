# Connectors

Connectors load secret values from external sources. They are read-only, stateful, and source-agnostic.

## The Connector Contract

```typescript
interface BaseConnector<Config extends object = object> {
  config: Config;
  logger?: BaseLogger;

  load(names: string[]): Promise<void>;
  get(name: string): SecretValue;

  setWorkingDir?(path: string | undefined): void;
  getWorkingDir?(): string | undefined;
}
```

### Required Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `load(names)` | Pre-load and validate all requested secrets | `Promise<void>` |
| `get(name)` | Return a previously loaded secret | `SecretValue` |

### Optional Methods

| Method | Purpose | When to Implement |
|--------|---------|-------------------|
| `setWorkingDir(path)` | Set working directory for file-based sources | For connectors that read from local files (e.g., `.env`) |
| `getWorkingDir()` | Get current working directory | Same as above |

### Rules

1. **`load()` before `get()`** — Always call `load()` before accessing secrets
2. **Throw on missing** — If a secret doesn't exist, throw an error in `load()`
3. **Cache internally** — Store loaded secrets in memory for fast access
4. **Read-only** — Never write or persist changes to the source

## EnvConnector Example

The `EnvConnector` loads secrets from environment variables and optional `.env` files.

**Package:** `@kubricate/plugin-env`

### Configuration

```typescript
interface EnvConnectorConfig {
  prefix?: string;           // default: 'KUBRICATE_SECRET_'
  allowDotEnv?: boolean;     // default: true
  caseInsensitive?: boolean; // default: false
  workingDir?: string;       // for .env file location
}
```

### Basic Usage

```typescript
import { EnvConnector } from '@kubricate/plugin-env';

const connector = new EnvConnector({ prefix: 'APP_SECRET_' });

// Load secrets
await connector.load(['DB_PASSWORD', 'API_KEY']);

// Access loaded secrets
const dbPassword = connector.get('DB_PASSWORD');
// Returns value of process.env.APP_SECRET_DB_PASSWORD
```

### How It Works

1. **Load .env file** (if `allowDotEnv = true`)
   - Looks for `.env` in working directory
   - Uses `dotenv` library to parse and load into `process.env`

2. **Validate existence**
   - For each requested secret name, checks `process.env[prefix + name]`
   - Throws if missing

3. **Parse value**
   - Attempts to parse JSON values automatically
   - Falls back to string if JSON parsing fails

4. **Cache internally**
   - Stores in a `Map<string, SecretValue>`

### Example: JSON Values

```bash
# .env
KUBRICATE_SECRET_API_CONFIG='{"endpoint":"https://api.example.com","timeout":5000}'
```

```typescript
const connector = new EnvConnector();
await connector.load(['API_CONFIG']);

const config = connector.get('API_CONFIG');
// config = { endpoint: 'https://api.example.com', timeout: 5000 }
```

### Example: Working Directory

```typescript
const connector = new EnvConnector();
connector.setWorkingDir('/path/to/project');

await connector.load(['DB_PASSWORD']);
// Reads /path/to/project/.env
```

## Error Patterns

Connectors enforce fail-fast behavior. Here are common errors:

### Missing Secret

**Cause:** Environment variable not set

```typescript
await connector.load(['MISSING_SECRET']);
// ❌ Error: Missing environment variable: KUBRICATE_SECRET_MISSING_SECRET
```

**Fix:**
```bash
export KUBRICATE_SECRET_MISSING_SECRET="value"
```

### Secret Not Loaded

**Cause:** `get()` called before `load()`

```typescript
const connector = new EnvConnector();
const value = connector.get('DB_PASSWORD');
// ❌ Error: Secret 'DB_PASSWORD' not loaded. Did you call load()?
```

**Fix:**
```typescript
await connector.load(['DB_PASSWORD']);
const value = connector.get('DB_PASSWORD'); // ✓ OK
```

### Invalid .env File

**Cause:** `.env` file not found or malformed

```typescript
await connector.load(['DB_PASSWORD']);
// ❌ Error: ENOENT: no such file or directory, open '/path/to/.env'
```

**Fix:**
- Create `.env` file in working directory
- Or set `allowDotEnv: false` to skip file loading

## Do's and Don'ts

| ✅ Do | ❌ Don't |
|-------|----------|
| Validate secrets in `load()` | Defer validation to `get()` |
| Cache loaded values internally | Fetch on every `get()` call |
| Throw descriptive errors | Return `undefined` or `null` |
| Support working directory for files | Hard-code paths |
| Keep connectors stateless (except cache) | Mutate external sources |

## Connector Checklist

When implementing a custom connector:

- [ ] Implement `load(names)` to fetch all secrets upfront
- [ ] Implement `get(name)` to return cached values
- [ ] Throw if a requested secret is missing
- [ ] Store loaded secrets in a `Map` or similar structure
- [ ] Parse values appropriately (JSON, strings, etc.)
- [ ] Provide clear error messages with actionable fixes
- [ ] Implement `setWorkingDir` if connector reads from files
- [ ] Add logger support for debugging (optional)
- [ ] Write unit tests for error cases

## Example: Vault Connector Skeleton

Here's a minimal Vault connector:

```typescript
import type { BaseConnector, SecretValue } from '@kubricate/core';

interface VaultConnectorConfig {
  endpoint: string;
  token: string;
  path: string;
}

export class VaultConnector implements BaseConnector<VaultConnectorConfig> {
  private secrets = new Map<string, SecretValue>();

  constructor(public config: VaultConnectorConfig) {}

  async load(names: string[]): Promise<void> {
    for (const name of names) {
      const path = `${this.config.path}/${name}`;

      try {
        const response = await fetch(`${this.config.endpoint}/v1/${path}`, {
          headers: { 'X-Vault-Token': this.config.token },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        this.secrets.set(name, data.data);
      } catch (error) {
        throw new Error(`Failed to load secret "${name}" from Vault: ${error.message}`);
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

**Usage:**
```typescript
const connector = new VaultConnector({
  endpoint: 'https://vault.example.com',
  token: process.env.VAULT_TOKEN!,
  path: 'secret/data/myapp',
});

await connector.load(['DB_PASSWORD']);
const password = connector.get('DB_PASSWORD');
```

## InMemoryConnector (Testing)

Kubricate includes an `InMemoryConnector` for testing:

```typescript
import { InMemoryConnector } from 'kubricate';

const connector = new InMemoryConnector({
  secrets: {
    DB_PASSWORD: 'test-password',
    API_KEY: 'test-key',
  },
});

await connector.load(['DB_PASSWORD', 'API_KEY']);
connector.get('DB_PASSWORD'); // 'test-password'
```

**When to use:**
- Unit tests for SecretManager
- Integration tests without external dependencies
- Local development without real secret backends

## What's Next

Connectors load values. Providers format them for Kubernetes. Let's explore providers next.

**Next →** [Providers Deep Dive](./05-providers.md)

**Related:**
- [Extensibility](./09-extensibility.md) — Writing custom connectors
- [Testing & Best Practices](./10-testing-best-practices.md) — Unit testing connectors
- [Validation](./07-validation.md) — Where connector errors are caught
