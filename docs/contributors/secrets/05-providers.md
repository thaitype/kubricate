# Providers

Providers format secret values as Kubernetes-native resources or injection payloads. They are Kubernetes-aware, strategy-based, and responsible for validation.

## The Provider Contract

```typescript
interface BaseProvider<Config, SupportedStrategies, SupportedEnvKeys> {
  name: string | undefined;
  config: Config;
  logger?: BaseLogger;

  readonly targetKind: string;
  readonly supportedStrategies: SupportedStrategies[];
  readonly supportedEnvKeys?: SupportedEnvKeys[];
  readonly allowMerge?: boolean;

  prepare(name: string, value: SecretValue): PreparedEffect[];
  getInjectionPayload(injectes: ProviderInjection[]): unknown;
  getTargetPath(strategy: SecretInjectionStrategy): string;

  mergeSecrets?(effects: PreparedEffect[]): PreparedEffect[];
  getEffectIdentifier?(effect: PreparedEffect): string;
}
```

### Required Methods

| Method | Purpose | Used By |
|--------|---------|---------|
| `prepare(name, value)` | Create kubectl effects from secret values | `kubricate secret apply` |
| `getInjectionPayload(injectes)` | Generate runtime injection data | `kubricate generate` |
| `getTargetPath(strategy)` | Return JSONPath for injection target | Stack injection |

### Optional Methods

| Method | Purpose | Required When |
|--------|---------|---------------|
| `mergeSecrets(effects)` | Merge multiple effects into one | `allowMerge = true` |
| `getEffectIdentifier(effect)` | Unique ID for conflict detection | Multiple effects per provider |

### Required Properties

| Property | Purpose | Example |
|----------|---------|---------|
| `targetKind` | Kubernetes resource kind | `'Deployment'`, `'Pod'` |
| `supportedStrategies` | Injection strategies allowed | `['env', 'envFrom']` |
| `supportedEnvKeys` | Allowed keys for structured secrets | `['username', 'password']` |
| `allowMerge` | Can multiple effects merge? | `true` (Opaque), `false` (TLS) |

## OpaqueSecretProvider

Creates standard Kubernetes Opaque Secrets.

**Package:** `@kubricate/plugin-kubernetes`

### Configuration

```typescript
interface OpaqueSecretProviderConfig {
  name: string;        // Kubernetes Secret name
  namespace?: string;  // default: 'default'
}
```

### Example

```typescript
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes';

const provider = new OpaqueSecretProvider({
  name: 'app-secret',
  namespace: 'production',
});

const effects = provider.prepare('DB_PASSWORD', 'postgres://...');
// effects = [{
//   type: 'kubectl',
//   secretName: 'DB_PASSWORD',
//   providerName: 'opaque',
//   value: {
//     apiVersion: 'v1',
//     kind: 'Secret',
//     metadata: {
//       name: 'app-secret',
//       namespace: 'production',
//     },
//     type: 'Opaque',
//     data: {
//       DB_PASSWORD: 'cG9zdGdyZXM6Ly8uLi4=' // base64 encoded
//     }
//   }
// }]
```

### Supported Strategies

- `env` — Individual environment variable injection

### Key Features

- **Merging:** Multiple secrets combine into one Kubernetes Secret
- **Base64 encoding:** All values automatically encoded
- **Type flexibility:** Accepts strings or flat objects

### Merging Example

```typescript
const manager = new SecretManager()
  .addProvider('opaque', new OpaqueSecretProvider({ name: 'app-secret' }))
  .addSecret({ name: 'DB_PASSWORD' })
  .addSecret({ name: 'API_KEY' });

// Both secrets merge into single Kubernetes Secret:
// kind: Secret
// data:
//   DB_PASSWORD: ...
//   API_KEY: ...
```

## DockerConfigSecretProvider

Creates Docker registry authentication secrets.

**Package:** `@kubricate/plugin-kubernetes`

### Configuration

```typescript
interface DockerConfigSecretProviderConfig {
  name: string;        // Kubernetes Secret name
  namespace?: string;  // default: 'default'
}
```

### Example

```typescript
import { DockerConfigSecretProvider } from '@kubricate/plugin-kubernetes';

const provider = new DockerConfigSecretProvider({
  name: 'docker-registry-secret',
  namespace: 'production',
});

const effects = provider.prepare('DOCKER_CONFIG', {
  username: 'myuser',
  password: 'mypass',
  registry: 'ghcr.io',
});
// effects = [{
//   type: 'kubectl',
//   value: {
//     apiVersion: 'v1',
//     kind: 'Secret',
//     metadata: { name: 'docker-registry-secret', namespace: 'production' },
//     type: 'kubernetes.io/dockerconfigjson',
//     data: {
//       '.dockerconfigjson': '<base64-encoded-auth-config>'
//     }
//   }
// }]
```

### Supported Strategies

- `imagePullSecret` — Inject via `spec.imagePullSecrets`

### Validation

Uses Zod schema to validate input:

```typescript
const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  registry: z.string().min(1),
});
```

### Usage in Stacks

```typescript
stack.useSecrets(secretManager, c => {
  c.secrets('DOCKER_CONFIG').inject('imagePullSecret');
});
```

**Generated YAML:**
```yaml
spec:
  template:
    spec:
      imagePullSecrets:
        - name: docker-registry-secret
```

## CustomTypeSecretProvider

Flexible provider for custom Kubernetes Secret types.

**Package:** `@kubricate/plugin-kubernetes`

### Configuration

```typescript
interface CustomTypeSecretProviderConfig {
  name: string;
  namespace?: string;
  secretType: string;                  // Custom type (e.g., 'vendor.com/api')
  allowedKeys?: readonly string[];     // Optional key validation
}
```

### Example: Vendor API Secrets

```typescript
import { CustomTypeSecretProvider } from '@kubricate/plugin-kubernetes';

const provider = new CustomTypeSecretProvider({
  name: 'vendor-api-secret',
  secretType: 'vendor.com/api',
  allowedKeys: ['api_key', 'endpoint'],
});

const effects = provider.prepare('VENDOR_API', {
  api_key: 'secret-key',
  endpoint: 'https://api.vendor.com',
});
```

### Supported Strategies

- `env` — Individual environment variable injection (with key selection)
- `envFrom` — Bulk environment variable injection

### Key Validation

When `allowedKeys` is set, the provider validates secret structure:

```typescript
const provider = new CustomTypeSecretProvider({
  name: 'vendor-secret',
  allowedKeys: ['api_key', 'endpoint'],
});

// ✓ Valid
provider.prepare('VENDOR_API', {
  api_key: 'value',
  endpoint: 'https://...',
});

// ❌ Error: Invalid keys provided: invalid_key. Allowed keys are: api_key, endpoint.
provider.prepare('VENDOR_API', {
  invalid_key: 'value',
});
```

### Usage with Key Selection

```typescript
stack.useSecrets(secretManager, c => {
  c.secrets('VENDOR_API')
    .forName('VENDOR_API_KEY')
    .inject('env', { key: 'api_key' });

  c.secrets('VENDOR_API')
    .forName('VENDOR_ENDPOINT')
    .inject('env', { key: 'endpoint' });
});
```

**Generated YAML:**
```yaml
env:
  - name: VENDOR_API_KEY
    valueFrom:
      secretKeyRef:
        name: vendor-api-secret
        key: api_key
  - name: VENDOR_ENDPOINT
    valueFrom:
      secretKeyRef:
        name: vendor-api-secret
        key: endpoint
```

### Strategy Homogeneity

CustomTypeSecretProvider enforces that all injections for a secret use the same strategy kind:

```typescript
// ❌ Error: All injections for this secret must use the same strategy kind
c.secrets('VENDOR_API').inject('env', { key: 'api_key' });
c.secrets('VENDOR_API').inject('envFrom'); // Different kind!
```

## PreparedEffect Types

Providers return PreparedEffects, which come in two forms:

### KubectlEffect

Applied directly via `kubectl apply`:

```typescript
{
  type: 'kubectl',
  secretName: 'DB_PASSWORD',
  providerName: 'opaque',
  value: {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: 'app-secret', namespace: 'default' },
    type: 'Opaque',
    data: { DB_PASSWORD: '...' }
  }
}
```

### CustomEffect

Provider-specific custom actions:

```typescript
{
  type: 'custom',
  secretName: 'DB_PASSWORD',
  providerName: 'custom',
  value: { /* provider-defined payload */ }
}
```

## Merging Behavior

When `allowMerge = true`, providers can combine multiple effects:

```typescript
mergeSecrets(effects: PreparedEffect[]): PreparedEffect[] {
  const merged: Record<string, string> = {};

  for (const effect of effects) {
    Object.assign(merged, effect.value.data);
  }

  return [{
    ...effects[0],
    value: {
      ...effects[0].value,
      data: merged,
    },
  }];
}
```

### Example

**Before merge:**
```
Effect 1: { data: { DB_PASSWORD: '...' } }
Effect 2: { data: { API_KEY: '...' } }
```

**After merge:**
```
Effect: { data: { DB_PASSWORD: '...', API_KEY: '...' } }
```

## Effect Identifiers

Providers use identifiers to detect conflicts:

```typescript
getEffectIdentifier(effect: PreparedEffect): string {
  const meta = effect.value?.metadata ?? {};
  return `${meta.namespace ?? 'default'}/${meta.name}`;
}
```

**Examples:**
- `default/app-secret`
- `production/vendor-api-secret`

If two effects share the same identifier, they are merged (if `allowMerge = true`) or trigger a conflict.

## Do's and Don'ts

| ✅ Do | ❌ Don't |
|-------|----------|
| Validate secret format in `prepare()` | Defer validation to orchestrator |
| Implement `allowMerge` if safe to merge | Allow merging for incompatible types (TLS) |
| Provide clear `getEffectIdentifier()` | Return vague identifiers |
| Support multiple strategies when possible | Hard-code single strategy |
| Make `getInjectionPayload()` pure | Perform side effects in injection |

## Provider Checklist

When implementing a custom provider:

- [ ] Implement `prepare(name, value)` to create effects
- [ ] Implement `getInjectionPayload(injectes)` for Stack injection
- [ ] Implement `getTargetPath(strategy)` to return JSONPath
- [ ] Set `targetKind` to Kubernetes resource type
- [ ] Set `supportedStrategies` array
- [ ] Validate secret structure in `prepare()`
- [ ] Set `allowMerge` appropriately
- [ ] Implement `mergeSecrets()` if `allowMerge = true`
- [ ] Implement `getEffectIdentifier()` for multi-effect support
- [ ] Write unit tests for merge and validation logic

## Provider Comparison

| Provider | Type | Merge | Strategies | Use Case |
|----------|------|-------|------------|----------|
| **Opaque** | `Opaque` | ✓ | `env` | General-purpose secrets |
| **DockerConfig** | `dockerconfigjson` | ✗ | `imagePullSecret` | Registry auth |
| **CustomType** | User-defined | ✓ | `env`, `envFrom` | Vendor-specific formats |

## What's Next

Providers define supported strategies. Let's explore injection strategies in depth.

**Next →** [Injection Strategies](./06-injection-strategies.md)

**Related:**
- [Extensibility](./09-extensibility.md) — Writing custom providers
- [Conflicts & Merging](./08-conflicts-merging.md) — How mergeSecrets() is called
- [Testing & Best Practices](./10-testing-best-practices.md) — Unit testing providers
