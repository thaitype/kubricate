# Extensibility & Monorepo Map

Kubricate is designed for safe extension. This guide shows what you can extend, how the monorepo is organized, and what rules keep the system stable.

**Who this is for**: Contributors and integrators building plugins, templates, or understanding where code lives.

---

## Extension Points

Kubricate provides three primary extension mechanisms. Each follows the open-closed principle — extend behavior without modifying framework code.

### Connectors (New Sources)

**What**: Load secrets from external backends

**When to Create**:
- You have a new secret backend (e.g., Bitwarden, HashiCorp Consul)
- Existing connectors don't support your auth method
- You need custom preprocessing (e.g., JSON parsing, decryption)

**Interface Requirements**:
- Implement `BaseConnector` interface
- Provide `load(names)` for upfront loading
- Provide `get(name)` for value retrieval
- Optional: Support working directory for file-based sources

**Example Use Case**: Create a `ConsulConnector` to fetch secrets from HashiCorp Consul KV store.

### Providers (New Formats/Injection)

**What**: Convert secrets into Kubernetes resources or inject into existing resources

**When to Create**:
- You need a new Kubernetes Secret type (e.g., bootstrap.kubernetes.io/token)
- You want custom injection strategies (e.g., volume mounts, Helm values)
- You're integrating with external operators (e.g., cert-manager, Vault)

**Interface Requirements**:
- Implement `BaseProvider` interface
- Provide `prepare(name, value)` for effect generation
- Provide `getInjectionPayload(injects)` for manifest injection
- Provide `getTargetPath(strategy)` for resource path resolution
- Optional: Implement `mergeSecrets(effects)` for multi-secret combining

**Example Use Case**: Create a `CertManagerProvider` to generate cert-manager Certificate resources.

### Stack Templates (Reusable Compositions)

**What**: Parameterized functions defining groups of related resources

**When to Create**:
- You have a repeating pattern (e.g., WebApp with Deployment + Service + Ingress)
- Multiple teams need the same infrastructure setup
- You want to enforce organizational standards

**Pattern**:
```typescript
const template = defineStackTemplate('Name', (input) => ({
  resource1: kubeModel(Kind1, { ... }),
  resource2: kubeModel(Kind2, { ... }),
}));
```

**Example Use Case**: Create a `DatabaseStack` template bundling StatefulSet, Service, PVC, and ConfigMap.

---

## Design Principles

### Open/Closed Principle

**Open for Extension**: Add new connectors, providers, and templates without touching framework code.

**Closed for Modification**: Framework internals remain stable. Extensions use published interfaces only.

### Effects-First

**Preparation is Pure**: Connectors and providers generate data structures, not side effects.

**Execution is Isolated**: Only executors perform I/O. This separation enables testing without mocks.

### Single Responsibility

**Each Component Has One Job**:
- Connectors load secrets
- Providers format secrets
- SecretManager registers components
- SecretsOrchestrator coordinates lifecycle
- Executors perform I/O

**No Cross-Talk**: Plugins never import from CLI. Orchestration never calls executors directly.

---

## Monorepo at 10,000 ft

Kubricate uses a pnpm monorepo with Turbo for orchestration and Changesets for versioning.

### Repository Tree

```
kubricate-3/
├── packages/
│   ├── core/                    # Base abstractions and interfaces
│   ├── kubricate/              # Main CLI and runtime
│   ├── stacks/                 # Official reusable stack templates
│   ├── toolkit/                # Lightweight utility functions
│   ├── plugin-env/             # EnvConnector for .env files
│   ├── plugin-kubernetes/      # Kubernetes secret providers
│   └── kubernetes-models/      # Kubernetes type definitions
├── examples/
│   ├── with-stack-template/    # Basic stack usage
│   ├── with-secret-manager/    # Secret management patterns
│   └── with-sidecar-container/ # Advanced injection strategies
├── configs/
│   ├── config-eslint/          # Shared ESLint configuration
│   ├── config-typescript/      # Shared TypeScript configuration
│   └── config-vitest/          # Shared Vitest configuration
├── tools/
│   ├── mono/                   # Build tool wrapper
│   └── template/               # Template for new packages
└── docs/
    └── contributors/           # Documentation for contributors
```

### Package Roles

| Package | Responsibility | Exports |
|---------|---------------|---------|
| `@kubricate/core` | Base interfaces, type definitions | BaseConnector, BaseProvider, types |
| `kubricate` | CLI, Stack, SecretManager, orchestration | Stack, SecretManager, defineConfig |
| `@kubricate/stacks` | Official stack templates | SimpleAppStack, NamespaceStack |
| `@kubricate/toolkit` | Utility functions | Type guards, validators, helpers |
| `@kubricate/plugin-env` | .env file connector | EnvConnector |
| `@kubricate/plugin-kubernetes` | Kubernetes secret providers | OpaqueSecretProvider, TlsSecretProvider, etc. |
| `@kubricate/kubernetes-models` | Type-safe K8s resources | Deployment, Service, Pod, etc. |

---

## Versioning Model

Kubricate uses Changesets for versioning with a hybrid strategy: fixed versioning for core packages, independent versioning for plugins.

### Fixed Versioning (Synchronized)

These packages always share the same version:

- `kubricate@0.21.0`
- `@kubricate/core@0.21.0`
- `@kubricate/stacks@0.21.0`

**Why?** They form the core API contract. Breaking changes in one affect the others.

### Independent Versioning

These packages evolve independently:

- `@kubricate/plugin-env@0.21.0`
- `@kubricate/plugin-kubernetes@0.21.0`
- `@kubricate/toolkit@0.21.0`
- `@kubricate/kubernetes-models@0.21.0`

**Why?** Plugins and utilities can add features or fix bugs without forcing core version bumps.

### Version Bumping Workflow

```bash
# 1. Create changeset (during development)
pnpm changeset
# Prompts: Which packages? Patch/Minor/Major? Changelog entry?

# 2. Version bump (automated in CI)
changeset version
# Updates package.json and CHANGELOG.md

# 3. Publish (automated in CI after merge)
changeset publish
# Publishes to npm
```

---

## Contribution Boundaries

### Who Talks to Whom

**Allowed Imports**:
- Plugins → `@kubricate/core` (interfaces only, via peerDependencies)
- `kubricate` → `@kubricate/core` (dependencies)
- `@kubricate/stacks` → `kubricate` (dependencies)
- Examples → All packages (devDependencies)

**Forbidden Imports**:
- Plugins ✗ `kubricate` (creates circular dependency)
- Plugins ✗ CLI layer (violates abstraction)
- Orchestration ✗ Executors (violates effects-first principle)

**Why These Rules?**

Plugins stay independent and version-compatible. Orchestration remains testable without I/O. CLI can change without affecting plugins.

### Testing Expectations

**Unit Tests (Required)**:
- Test pure logic without side effects
- No live backends (Vault, Azure, etc.)
- Use in-memory connectors for testing providers
- Mock kubectl executor for provider tests

**Integration Tests (Optional)**:
- Test against real backends in CI
- Use docker-compose for local Vault/PostgreSQL
- Tag with `@integration` to skip in fast CI

**Example**:
```typescript
// Unit test (fast)
describe('OpaqueSecretProvider', () => {
  it('generates correct effect', () => {
    const provider = new OpaqueSecretProvider({ name: 'test' });
    const effects = provider.prepare('API_KEY', 's3cr3t');
    expect(effects[0].type).toBe('kubectl');
  });
});

// Integration test (slower, optional)
describe('VaultConnector @integration', () => {
  it('loads secrets from real Vault', async () => {
    const connector = new VaultConnector({ url: 'http://localhost:8200' });
    await connector.load(['API_KEY']);
    expect(connector.get('API_KEY')).toBeDefined();
  });
});
```

---

## Pointers to Reference Docs & Examples

### Connector Reference
- [BaseConnector Interface](../secrets/04-connectors.md)
- [EnvConnector Implementation](../../packages/plugin-env/src/EnvConnector.ts)
- [Connector Testing Guide](../secrets/10-testing-best-practices.md)

### Provider Reference
- [BaseProvider Interface](../secrets/05-providers.md)
- [OpaqueSecretProvider Implementation](../../packages/plugin-kubernetes/src/OpaqueSecretProvider.ts)
- [Provider Testing Guide](../secrets/10-testing-best-practices.md)

### Stack Template Reference
- [Stack Architecture](../secrets/03-core-concepts.md)
- [SimpleAppStack Example](../../packages/stacks/src/SimpleAppStack.ts)
- [Template Patterns](../../examples/with-stack-template/kubricate.config.ts)

### Examples
- [Basic Stack Usage](../../examples/with-stack-template/)
- [Secret Management](../../examples/with-secret-manager/)
- [Advanced Injection](../../examples/with-sidecar-container/)

---

## Where to Next

**Understand the System**:
- [Architecture Overview](./01-architecture-overview.md) — Layers and effects-first design
- [Secrets System](./03-secrets-overview.md) — Connectors, providers, orchestration

**See Commands in Practice**:
- [User Workflows & CLI](./02-user-workflows-cli.md) — Command recipes and troubleshooting

**Deep Dive into Secrets**:
- [Connectors Guide](../secrets/04-connectors.md) — Implementing custom connectors
- [Providers Guide](../secrets/05-providers.md) — Implementing custom providers
- [Extensibility Patterns](../secrets/09-extensibility.md) — Design patterns for extensions
- [Testing Best Practices](../secrets/10-testing-best-practices.md) — Unit and integration testing

**Explore the Code**:
- Browse `packages/plugin-env/` for a simple connector
- Browse `packages/plugin-kubernetes/` for multiple provider examples
- Browse `examples/` for real-world usage patterns
