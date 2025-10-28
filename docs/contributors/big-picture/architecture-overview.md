# Architecture Overview

Managing Kubernetes infrastructure often feels fragile. Kubricate makes it declarative and type-safe — turning scattered YAML into structured code you can trust. This document explains how Kubricate works from the ground up, showing you the complete system from configuration to deployment.

**Who this is for**: Contributors, integrators, and platform engineers who want to understand Kubricate's architecture before diving into implementation details or extending the framework.

## What Kubricate Is

**The Problem**
Kubernetes infrastructure sprawls across YAML files, with secrets scattered between .env files, Vault, cloud providers, and CI configs. One typo breaks prod. Switching secret backends means rewriting templates across repos. Helm values reference secrets with no validation they exist.

**The Solution**
Kubricate replaces fragile YAML with reusable, type-safe infrastructure written in TypeScript. You define resources once, compose them into Stacks, declare secrets abstractly, and generate everything from code validated at build time.

**The Outcome**
Teams get type-checked infrastructure, reusable patterns, backend-agnostic secrets, and CI-native workflows. No runtime controllers. No CRDs. Just clean YAML generated from trusted code.

---

## System Map

Kubricate's architecture follows a layered design where each layer has a single responsibility and communicates through well-defined interfaces.

```
┌─────────────────────────────────────────────────────────────┐
│                      External Sources                        │
│  (.env files, Vault, Azure KV, 1Password, Cloud Secrets)   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      Plugin Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Connectors  │  │  Providers   │  │ Stack Templates │  │
│  │ (Load secrets│  │ (Format for  │  │  (Reusable      │  │
│  │  from sources)│  │  K8s/inject) │  │   compositions) │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Orchestration Layer                         │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ SecretManager  │  │SecretsOrchestrator│ │ Stack Engine│ │
│  │ (Registry for  │  │  (Validation,     │ │(Resource    │ │
│  │  connectors,   │  │   conflict res.,  │ │ composition,│ │
│  │  providers)    │  │   effect merging) │ │ injection)  │ │
│  └────────────────┘  └──────────────────┘  └────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                       CLI Layer                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Commands   │  │ ConfigLoader │  │    Executors     │  │
│  │ (generate,  │  │ (Load & val- │  │ (kubectl, file   │  │
│  │  secret)    │  │  idate conf) │  │  I/O)            │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                        Outputs                               │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ Kubernetes YAML  │  │  Effects (kubectl apply, etc.)  │ │
│  │  (Manifests)     │  │                                 │ │
│  └──────────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Layer Responsibilities**:

- **External Sources**: Backend systems where secrets live
- **Plugin Layer**: Extensibility points for custom behavior
- **Orchestration Layer**: Core business logic and coordination
- **CLI Layer**: User interface and I/O operations
- **Outputs**: Generated artifacts and applied effects

---

## End-to-End Flow

Kubricate's lifecycle follows five distinct steps, moving from configuration to deployment. Each step is pure and testable until the final application phase.

### The Five Steps

```
Configure → Validate → Prepare → Merge → Render/Apply
```

**1. Configure** (Plugin Layer)
You define your infrastructure in `kubricate.config.ts`:
- Register Connectors (where secrets come from)
- Register Providers (how secrets are formatted)
- Declare Stacks (groups of resources)
- Wire secrets into resources via injection strategies

**2. Validate** (Orchestration Layer)
Kubricate validates the configuration:
- All stacks have valid IDs
- All secrets have assigned connectors and providers
- Secret values can be loaded from connectors
- No duplicate or conflicting registrations

**3. Prepare** (Orchestration Layer)
Pure data structures are generated without side effects:
- Stacks build their resource trees via `ResourceComposer`
- Providers generate effects via `prepare()` method
- Effects describe what will happen (data) not how to do it (side effects)

**4. Merge** (Orchestration Layer)
`SecretsOrchestrator` resolves conflicts:
- Groups effects by conflict key (provider + identifier)
- Determines conflict level (intraProvider, crossProvider, crossManager)
- Applies strategy (autoMerge, overwrite, error)
- Providers merge secrets via `mergeSecrets()` method

**5. Render/Apply** (CLI Layer)
Side effects execute in controlled environments:
- **Render**: Write YAML files to disk (manifest generation)
- **Apply**: Execute kubectl commands (secret deployment)

### Effects-First Design

**Key Principle**: Preparation returns data, not side effects. This separation enables testing, dry-runs, and auditability.

```typescript
// Prepare (pure)
const effects = provider.prepare('API_KEY', 's3cr3t');
// → [{ type: 'kubectl', value: { kind: 'Secret', ... } }]

// Apply (side effects)
for (const effect of effects) {
  await kubectl.apply(effect.value);
}
```

**Benefits**:
- Testable preparation logic (no mocks needed)
- Dry-run support (inspect effects before applying)
- Conflict detection happens before I/O
- Clear audit trail of what changed

---

## User Workflows

Kubricate fits into three common workflows. Each serves different team needs while maintaining the same core architecture.

### Local Development

**Goal**: Fast feedback during infrastructure changes

```bash
# 1. Design and preview manifests
kubricate generate

# 2. Validate secrets exist (no cluster writes)
kubricate secret validate

# 3. Create/update Secret resources
kubricate secret apply

# 4. Deploy workloads
kubectl apply -f ./manifests
```

**Why this order?**
Design YAML first to catch issues early. Validate secrets before touching the cluster. Apply secrets before workloads reference them.

**Tip**: For offline work, run steps 1-2 only.

### CI Pipeline

**Goal**: Artifact-first deployment with fail-fast validation

```bash
# 1. Fail fast on missing secrets
kubricate secret validate

# 2. Generate versioned manifests
kubricate generate

# 3. Publish artifacts
# (Attach to PR or push to artifact store)

# 4. Deploy secrets (in deploy job only)
kubricate secret apply
```

**Key difference**: Secrets applied only in deployment environments, not during build.

### GitOps Workflow

**Goal**: Pull-based deployment with Git as source of truth

```bash
# 1. Pre-flight validation (CI)
kubricate secret validate

# 2. Commit manifests (CI)
kubricate generate
git add manifests/ && git commit -m "Update manifests"

# 3. GitOps controller applies manifests
# ArgoCD or Flux watches repository

# 4. Apply secrets via:
# - Kubricate job/pipeline step
# - External secret operator
```

### Decision Matrix

| Goal                          | Command               | Where         |
|-------------------------------|-----------------------|---------------|
| See diffs fast                | `generate`            | Local/CI      |
| Catch missing secrets early   | `secret validate`     | Local/CI      |
| Make secrets exist in cluster | `secret apply`        | Deploy stage  |
| Deploy workloads              | `kubectl apply -f`    | Deploy/GitOps |

---

## Monorepo Structure

Kubricate uses a pnpm monorepo with Turbo for orchestration and Changesets for versioning.

### Package Tree

```
packages/
├── core/                    # Base abstractions (BaseConnector, BaseProvider)
├── kubricate/              # Main CLI and Stack/SecretManager runtime
├── stacks/                 # Official reusable stack templates
├── toolkit/                # Lightweight utility functions
├── plugin-env/             # EnvConnector (reads .env files)
├── plugin-kubernetes/      # Kubernetes secret providers (Opaque, TLS, etc.)
└── kubernetes-models/      # Kubernetes type definitions

examples/                   # Example projects (not published)
configs/                    # Shared ESLint, TypeScript, Vitest configs
tools/                      # Build tooling (mono wrapper, templates)
```

### Versioning Model

**Fixed Versioning** (always synchronized):
- `kubricate`
- `@kubricate/core`
- `@kubricate/stacks`

These packages form the core API contract and version together.

**Independent Versioning**:
- `@kubricate/plugin-*` packages
- `@kubricate/toolkit`
- `@kubricate/kubernetes-models`

Plugins can evolve independently without forcing core version bumps.

### Package Responsibility Matrix

| Package | Responsibility | Consumed By |
|---------|---------------|-------------|
| `@kubricate/core` | Base interfaces, type definitions | All packages |
| `kubricate` | CLI, Stack, SecretManager, orchestration | Applications, stacks |
| `@kubricate/stacks` | Official stack templates | Applications |
| `@kubricate/toolkit` | Utility functions | Core, plugins |
| `@kubricate/plugin-env` | .env file connector | Applications |
| `@kubricate/plugin-kubernetes` | Kubernetes secret providers | Applications |
| `@kubricate/kubernetes-models` | Type-safe K8s resource definitions | Core, stacks |

---

## Runtime Boundaries

Kubricate maintains strict separation between layers to ensure testability, predictability, and maintainability.

### What Runs Where

**CLI Layer**:
- Command parsing (yargs)
- Configuration loading (unconfig)
- Logger injection
- File I/O operations
- Subprocess execution

**Orchestration Layer**:
- Stack building (resource composition)
- Secret resolution (connector/provider mapping)
- Effect preparation (pure data generation)
- Conflict resolution (merge strategies)
- Validation (config, secrets, conflicts)

**Plugin Layer**:
- Secret loading (connectors)
- Resource formatting (providers)
- Template definitions (stack templates)

**Executor Layer**:
- kubectl subprocess wrapper
- File system operations
- External command execution

### Single Responsibility Per Layer

**No Cross-Talk Rules**:
- Plugins never import from CLI
- Orchestration never calls executors directly
- Effects carry all data needed for execution
- Configuration validation happens before execution

### Effects-First Execution

Providers return effects (data structures) describing operations. Executors apply effects with side effects isolated:

```typescript
// Provider (pure)
prepare(name, value): PreparedEffect[] {
  return [{ type: 'kubectl', value: secretResource }];
}

// Executor (side effects)
async apply(effect) {
  await kubectl.apply(effect.value);
}
```

**Why?**
Preparation logic becomes testable without mocks. Dry-run mode inspects effects without applying. Conflict detection happens before I/O.

---

## Extensibility Points

Kubricate provides three primary extension mechanisms. Each follows the open-closed principle — extend behavior without modifying framework code.

### Connectors

**Purpose**: Load secrets from external sources

**Interface**: `BaseConnector`
- `load(names: string[])`: Pre-load validation
- `get(name: string)`: Retrieve loaded value

**Examples**:
- `.env` files
- Vault
- Azure Key Vault
- 1Password
- AWS Secrets Manager

**Pattern**: Connectors implement read-only access to secret backends. They must load all secrets upfront to enable fail-fast validation.

### Providers

**Purpose**: Format secrets for Kubernetes or inject into existing resources

**Interface**: `BaseProvider`
- `prepare(name, value)`: Generate effects for `secret apply`
- `getInjectionPayload(injects)`: Generate injection data for manifest generation
- `getTargetPath(strategy)`: Specify resource path for injection
- `mergeSecrets(effects)`: Combine multiple secrets (optional)

**Examples**:
- Kubernetes Opaque Secret
- Docker registry credentials
- TLS certificates
- ExternalSecret CRDs
- Vault Agent annotations

**Pattern**: Providers support multiple injection strategies (env, volume, annotation) and can merge effects from multiple secrets.

### Stack Templates

**Purpose**: Reusable resource compositions

**Pattern**: Templates define parameterized resource groups

```typescript
const WebAppTemplate = defineStackTemplate('WebApp', (input) => ({
  deployment: kubeModel(Deployment, { ... }),
  service: kubeModel(Service, { ... }),
}));
```

**Benefits**:
- Type-safe inputs
- Consistent patterns across teams
- Composable (stacks can include other templates)
- Testable in isolation

### Connector × Provider Matrix

```
            Opaque  Docker  TLS  ExternalSecret
.env        ✓       ✓       ✓    ✓
Vault       ✓       ✓       ✓    ✓
Azure KV    ✓       ✓       ✓    ✓
1Password   ✓       ✓       ✓    ✓
```

Any connector works with any provider — the abstraction is complete.

---

## Configuration Philosophy

Kubricate configuration follows three core principles: single source of truth, convention over configuration, and compile-time safety.

### Single Source of Truth

**All infrastructure lives in `kubricate.config.ts`**:
- Stack definitions
- Secret management
- Output configuration
- Metadata injection

**Why?**
No hidden state. No runtime discovery. Everything visible in one place.

```typescript
export default defineConfig({
  stacks: { ... },
  secret: { ... },
  generate: { ... },
  metadata: { ... },
});
```

### Convention Over Configuration

**Smart Defaults**:
- Default namespace: `default`
- Default output mode: `stack` (one file per stack)
- Default conflict strategy: `autoMerge` for intraProvider, `error` for cross-boundary
- Automatic metadata injection (disable if needed)

**When to Override**:
- Multi-tenant deployments (specify namespaces)
- GitOps workflows (use `flat` output mode)
- Strict validation (enable `strict: true` conflict mode)

### Type Safety

**Compile-Time Guardrails**:
- Stack input validated by TypeScript
- Secret names must exist in SecretManager
- Injection strategies must be supported by provider
- Connector/provider types flow through entire pipeline

**Example**:
```typescript
// TypeScript error: 'volume' not in supportedStrategies
injector.secrets('API_KEY').inject('volume');
```

**Why?**
Catch configuration errors during development, not deployment.

---

## Operational Model

Kubricate adapts to different team patterns through configuration and plugin choices.

### Local Development

**Pattern**: `.env` files + Opaque Secrets

```typescript
const manager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('opaque', new OpaqueSecretProvider({ name: 'app-secret' }))
  .addSecret('DATABASE_URL');
```

**Workflow**:
1. Developer edits `.env` locally
2. `kubricate generate` creates manifests with Secret references
3. `kubricate secret apply` syncs secrets to cluster
4. `kubectl apply` deploys workloads

**Benefits**: Fast iteration, no external dependencies.

### CI/CD

**Pattern**: Vault/Azure KV + Typed Providers

```typescript
const manager = new SecretManager()
  .addConnector('vault', new VaultConnector({ ... }))
  .addProvider('docker', new DockerConfigSecretProvider({ ... }))
  .addProvider('tls', new TlsSecretProvider({ ... }))
  .addSecret({ name: 'DOCKER_CONFIG', provider: 'docker' })
  .addSecret({ name: 'TLS_CERT', provider: 'tls' });
```

**Workflow**:
1. CI pulls secrets from Vault
2. `kubricate secret validate` fails fast on missing values
3. `kubricate generate` produces artifacts
4. Deploy job runs `kubricate secret apply` to staging/prod
5. GitOps controller applies manifests

**Benefits**: Centralized secret management, audit trails, rotation support.

### GitOps

**Pattern**: Commit manifests, apply secrets separately

```typescript
export default defineConfig({
  generate: {
    outputMode: 'flat',  // Single stacks.yml
    cleanOutputDir: true,
  },
});
```

**Workflow**:
1. CI generates manifests and commits to Git
2. ArgoCD/Flux watches repository
3. Separate pipeline applies secrets via `kubricate secret apply`
4. Controller deploys workloads after secrets exist

**Benefits**: Git as source of truth, declarative drift detection.

---

## Non-Goals and Trade-offs

Kubricate makes deliberate choices about what it is — and what it isn't.

### Not a Kubernetes Controller

**Trade-off**: No runtime reconciliation

Kubricate generates manifests at build time. It doesn't watch your cluster or auto-correct drift.

**Why?**
Simpler operational model. No new control plane to manage. Fits existing GitOps workflows.

**Use with**: ArgoCD, Flux, kubectl

### Not a Replacement for Helm

**Trade-off**: Different abstraction level

Helm provides lifecycle management (install, upgrade, rollback). Kubricate provides type-safe generation.

**Why?**
Kubricate focuses on definition clarity, not deployment orchestration.

**Use together**: Generate Helm values from Kubricate Stacks if needed.

### TypeScript Dependency

**Trade-off**: Requires Node.js toolchain

You write infrastructure in TypeScript, not YAML or Go.

**Why?**
TypeScript provides type safety, IDE support, and existing ecosystem. The trade-off is worth the benefits.

**Alternative**: For Go-native teams, consider Cue or cdk8s.

### Explicit Plugin Contracts

**Trade-off**: Can't auto-discover backends

You must explicitly register connectors and providers. No magic discovery.

**Why?**
Explicit is better than implicit. Configuration should be obvious and auditable.

**Benefit**: No hidden dependencies or runtime surprises.

---

## Quality and Safety Guards

Kubricate enforces quality through multiple validation layers. Each layer catches different classes of errors.

### Validation Layers

**1. Configuration Validation**
- Stack IDs must be valid identifiers
- No duplicate stack IDs
- At least one connector and provider registered
- Default connector/provider set if multiple exist

**2. Secret Declaration Validation**
- All secrets have assigned connectors
- All secrets have assigned providers
- No orphaned secret references

**3. Secret Loading Validation**
- All declared secrets exist in connectors
- Connectors throw on missing values
- Fails fast before any cluster operations

**4. Conflict Validation**
- Providers implement required merge methods
- Effect identifiers unique when merging enabled
- Conflict strategies compatible with strict mode

### Conflict Strategies

**Three Conflict Levels**:
- **intraProvider**: Multiple secrets → same provider instance
- **crossProvider**: Different providers → same resource
- **crossManager**: Different SecretManagers → same resource

**Three Resolution Strategies**:
- **autoMerge**: Shallow merge objects/arrays (default for intraProvider)
- **overwrite**: Keep last value, log warning
- **error**: Fail immediately (default for cross-boundary conflicts)

**Strict Mode**: Sets all levels to `error` for production safety.

### Determinism and Hashing

**Resource Hashing**:
- SHA-256 hash of resource contents
- Excludes `managedAt` timestamp
- Injected as annotation: `kubricate.thaitype.dev/resource-hash`

**Benefits**:
- Detect drift between generated and applied manifests
- Identify unchanged resources during updates
- Enable smart diff tools

**Metadata Injection**:
- Stack ID, resource ID, version
- Managed timestamp (ISO format)
- Resource hash (SHA-256)

**Why?**
Provides traceability from config to deployed resource.

---

## Glossary

**Connector**
Plugin that loads secret values from external sources (e.g., .env, Vault). Implements `load()` and `get()` methods.

**Provider**
Plugin that converts secrets into Kubernetes resources or injection payloads. Implements `prepare()`, `getInjectionPayload()`, and `getTargetPath()`.

**Effect**
Data structure describing an operation to perform. Two types: `KubectlEffect` (applies via kubectl) and `CustomEffect` (provider-specific).

**Stack**
Group of related Kubernetes resources with optional secret injection. Created via `fromTemplate()` or `fromStatic()`.

**Template**
Parameterized function defining reusable resource compositions. Created via `defineStackTemplate()`.

**Orchestration**
Central coordination of secret loading, validation, conflict resolution, and effect merging. Handled by `SecretsOrchestrator`.

**Injection**
Process of merging secret references into existing resources during manifest generation. Configured via `useSecrets()` API.

**Conflict Key**
Unique identifier for grouping effects during merge. Format: `${provider.secretType}:${provider.getEffectIdentifier(effect)}`.

**Prepared Effect**
Output of provider's `prepare()` method. Describes what will happen without performing side effects.

---

## Where to Go Next

This overview introduced Kubricate's architecture from 10,000 feet. Now drill down into specific areas:

**Understand Secrets**:
- [Secrets Overview](../secrets/00-vision-overview.md) — Why declarative secret management matters
- [Lifecycle & CLI](../secrets/02-lifecycle.md) — Validate, prepare, merge, apply
- [Connectors](../secrets/04-connectors.md) — Loading secrets from backends
- [Providers](../secrets/05-providers.md) — Formatting and injection strategies

**Explore Core Concepts**:
- [Stack Architecture](../secrets/03-core-concepts.md) — Resource composition and injection
- [Conflicts & Merging](../secrets/08-conflicts-merging.md) — Resolution strategies
- [Validation](../secrets/07-validation.md) — Quality guards

**Extend Kubricate**:
- [Extensibility](../secrets/09-extensibility.md) — Writing custom connectors and providers
- [Testing Best Practices](../secrets/10-testing-best-practices.md) — Testing your extensions

**See Examples**:
- `examples/with-stack-template/` — Basic stack usage
- `examples/with-secret-manager/` — Secret management patterns
- `examples/with-sidecar-container/` — Advanced injection strategies

Choose your path based on what you want to understand or build next.
