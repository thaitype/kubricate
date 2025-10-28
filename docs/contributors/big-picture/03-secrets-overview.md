# Secrets System — Conceptual Overview

Secret management in Kubernetes often feels fragile. Kubricate makes it declarative and type-safe through a connector-provider architecture that separates secret sources from secret formats.

**Who this is for**: Engineers deciding how to model secrets, reviewers evaluating the design, and contributors understanding the system before implementation.

---

## Why "Connector × Provider"

Most Kubernetes secret tools tightly couple source and format. If you switch from Vault to 1Password, you rewrite YAML. If you change from Opaque Secrets to ExternalSecrets, you modify all your deployments.

**Kubricate separates these concerns**:

- **Connectors** — Where secrets come from (source)
- **Providers** — How secrets are formatted (destination)

This separation means you can swap Vault for Azure Key Vault without changing your Providers. Or switch from Opaque Secrets to ExternalSecrets without changing your Connectors.

```
     .env ────┐
     Vault ───┼──▶ Connectors ──▶ SecretManager ──▶ Providers ──┬──▶ Opaque Secret
  Azure KV ───┤                                                   ├──▶ Docker Secret
1Password ────┘                                                   ├──▶ TLS Secret
                                                                  └──▶ ExternalSecret
```

**The Matrix**: Any connector works with any provider. The abstraction is complete.

---

## Roles

### Connectors (Read-Only Sources)

**Purpose**: Load secret values from external backends

**Interface**:
- `load(names)` — Pre-load all secrets, fail fast on missing values
- `get(name)` — Retrieve a loaded secret value

**Examples**:
- EnvConnector — Reads `.env` files
- VaultConnector — Fetches from HashiCorp Vault
- AzureKeyVaultConnector — Pulls from Azure Key Vault
- OnePasswordConnector — Connects to 1Password

**Pattern**: Connectors implement read-only access. They load all secrets upfront to enable fail-fast validation before any cluster operations.

### Providers (Kubernetes-Aware Formatting)

**Purpose**: Convert secrets into Kubernetes resources or inject into existing resources

**Interface**:
- `prepare(name, value)` — Generate effects for `secret apply`
- `getInjectionPayload(injects)` — Generate data for manifest generation
- `getTargetPath(strategy)` — Specify resource path for injection
- `mergeSecrets(effects)` — Combine multiple secrets (optional)

**Examples**:
- OpaqueSecretProvider — Kubernetes Opaque Secret
- DockerConfigSecretProvider — imagePullSecret for Docker registries
- TlsSecretProvider — TLS certificates
- ExternalSecretProvider — External Secrets Operator CRDs

**Pattern**: Providers support multiple injection strategies (env, volume, annotation) and can merge effects from multiple secrets into a single resource.

### SecretManager (Registry)

**Purpose**: Central registry for connectors, providers, and secret declarations

**Responsibilities**:
- Register connectors (sources)
- Register providers (destinations)
- Declare secrets with mappings
- Resolve providers during manifest generation
- Resolve values during secret application

**Example**:
```typescript
const manager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('opaque', new OpaqueSecretProvider({ name: 'app-secret' }))
  .setDefaultProvider('opaque')
  .addSecret('DATABASE_URL');
```

### SecretsOrchestrator (Validate/Prepare/Merge)

**Purpose**: Central engine for secret lifecycle, validation, and conflict resolution

**Responsibilities**:
- Validate configuration (all secrets have connectors/providers)
- Load secrets from connectors
- Prepare effects from providers
- Merge effects with conflict resolution
- Return final effects for application

**Example Flow**:
```
validate() → loadSecrets() → prepareEffects() → mergePreparedEffects() → apply()
```

---

## Effects Model

**Key Principle**: Prepare returns data, apply performs side effects later.

### Preparation Phase (Pure)

Providers generate effects describing operations without executing them:

```typescript
provider.prepare('API_KEY', 's3cr3t')
// Returns: [{ type: 'kubectl', value: { kind: 'Secret', ... } }]
```

Effects are pure data structures. You can inspect, validate, and transform them before committing to changes.

### Application Phase (Side Effects)

Executors process effects with isolated side effects:

```typescript
for (const effect of effects) {
  await kubectl.apply(effect.value);
}
```

**Two Effect Types**:

1. **KubectlEffect** — Applied via kubectl (Kubernetes resources)
2. **CustomEffect** — Provider-specific actions (annotations, scripts)

**Why This Separation?**

Testing preparation logic requires no mocks. Dry-run mode inspects effects without applying. Conflict detection happens before I/O. Audit trails are clear records of what changed.

---

## Conflict Levels & Default Strategies

When multiple secrets target the same resource, Kubricate detects conflicts at three levels:

### Conflict Levels

**1. intraProvider** — Multiple secrets → same provider instance

Example: Two secrets both using `OpaqueSecretProvider` with the same resource name.

**Default Strategy**: `autoMerge` — Shallow merge objects/arrays

**2. crossProvider** — Different providers → same resource

Example: `OpaqueSecretProvider` and `TlsSecretProvider` both creating a Secret named `app-secret`.

**Default Strategy**: `error` — Fail immediately

**3. crossManager** — Different SecretManagers → same resource

Example: Two SecretManagers in different stacks both creating the same Secret.

**Default Strategy**: `error` — Fail immediately

### Resolution Strategies

**autoMerge**:
- Shallow merge objects
- Append arrays
- Used for intraProvider by default

**overwrite**:
- Keep last value
- Log warning about overwritten secrets
- Use cautiously in production

**error**:
- Fail immediately on conflict
- Default for cross-boundary conflicts
- Safest option for production

### Strict Mode

Set all levels to `error` for production safety:

```typescript
export default defineConfig({
  secret: {
    conflict: {
      strict: true,  // All conflicts become errors
    },
  },
});
```

### Conflict Resolution Flow

```
Effects Generated
      │
      ▼
Group by Conflict Key
  (provider.secretType:identifier)
      │
      ▼
Determine Conflict Level
  (intra/cross provider/manager)
      │
      ▼
Apply Strategy
  (autoMerge/overwrite/error)
      │
      ▼
Provider Merges Secrets
  (if allowMerge: true)
      │
      ▼
Final Merged Effects
```

---

## Validation Layers

Kubricate enforces quality through four validation layers:

### 1. Configuration Validation

**What**: Validates structure before execution

**Checks**:
- Stack IDs are valid identifiers
- No duplicate stack IDs
- At least one connector registered
- At least one provider registered

### 2. Secret Manager Validation

**What**: Validates secret declarations

**Checks**:
- All secrets have assigned connectors
- All secrets have assigned providers
- Default connector/provider set if multiple exist

### 3. Secret Loading Validation

**What**: Validates secret values exist

**Checks**:
- All declared secrets can be loaded from connectors
- Connectors throw on missing values
- Fails fast before cluster operations

### 4. Conflict Validation

**What**: Validates merge compatibility

**Checks**:
- Providers implement required merge methods
- Effect identifiers unique when merging enabled
- Conflict strategies compatible with strict mode

**Why Multiple Layers?**

Each layer catches different error classes. Configuration errors fail at load time. Declaration errors fail during manager build. Loading errors fail during validation. Conflict errors fail during merge.

---

## Patterns & Anti-patterns

### Patterns ✓

**Explicit Declarations**:
```typescript
// Declare what you need
.addSecret('DATABASE_URL')
.addSecret({ name: 'API_KEY', provider: 'custom' })
```

**Provider Specialization**:
```typescript
// Different secrets, different providers
.addProvider('docker', new DockerConfigSecretProvider({ ... }))
.addProvider('tls', new TlsSecretProvider({ ... }))
.addSecret({ name: 'DOCKER_CONFIG', provider: 'docker' })
.addSecret({ name: 'TLS_CERT', provider: 'tls' })
```

**Fail-Fast Validation**:
```bash
# Validate before generating
kubricate secret validate && kubricate generate
```

### Anti-patterns ✗

**Implicit Defaults Without Validation**:
```typescript
// Don't assume secrets exist
// Always declare explicitly
.addSecret('ASSUMED_SECRET')  // ✗ No validation
```

**Cross-Provider Resource Collisions**:
```typescript
// Don't use same name for different providers
.addProvider('p1', new OpaqueSecretProvider({ name: 'app-secret' }))
.addProvider('p2', new TlsSecretProvider({ name: 'app-secret' }))
// ✗ Conflict at crossProvider level
```

**Overwrite in Production**:
```typescript
// Don't use overwrite strategy in production
conflict: {
  strategies: {
    crossProvider: 'overwrite',  // ✗ Dangerous
  },
}
```

---

## Connector × Provider Matrix

Any connector works with any provider. Here's a conceptual view:

```
                Opaque  Docker  TLS  ExternalSecret
.env            ✓       ✓       ✓    ✓
Vault           ✓       ✓       ✓    ✓
Azure KV        ✓       ✓       ✓    ✓
1Password       ✓       ✓       ✓    ✓
AWS Secrets     ✓       ✓       ✓    ✓
```

**What This Means**:

Switching from `.env` to Vault? Change the connector, keep the provider.

Switching from Opaque to ExternalSecret? Change the provider, keep the connector.

The abstraction is complete — source and format are independent.

---

## Where to Next

**Understand Implementation Details**:
- [Extensibility & Monorepo](./04-extensibility-and-monorepo.md) — How to build custom connectors and providers

**See Commands in Action**:
- [User Workflows & CLI](./02-user-workflows-cli.md) — Command recipes and troubleshooting

**Explore Architecture**:
- [Architecture Overview](./01-architecture-overview.md) — System layers and effects-first design

**Deep Dive**:
- [Connectors Reference](../secrets/04-connectors.md) — Connector interface and patterns
- [Providers Reference](../secrets/05-providers.md) — Provider interface and injection strategies
- [Conflicts & Merging](../secrets/08-conflicts-merging.md) — Resolution algorithm details
- [Validation](../secrets/07-validation.md) — Complete validation guide
