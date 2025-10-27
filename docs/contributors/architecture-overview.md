# 🏗️ Architecture Overview

This document provides a comprehensive overview of Kubricate's architecture, explaining how the framework is organized and how its components interact.

## Table of Contents

- [Monorepo Structure](#monorepo-structure)
- [Package Dependencies](#package-dependencies)
- [Core Architecture](#core-architecture)
- [Design Principles](#design-principles)
- [Key Patterns](#key-patterns)

## Monorepo Structure

Kubricate is organized as a **pnpm workspace monorepo** using **Turbo** for build orchestration.

```
kubricate-3/
├── packages/               # Core packages
│   ├── kubricate/         # CLI + orchestration
│   ├── core/              # Base classes & types
│   ├── stacks/            # Official stack templates
│   ├── toolkit/           # Utility functions
│   ├── plugin-env/        # .env connector
│   ├── plugin-kubernetes/ # K8s secret providers
│   └── kubernetes-models/ # K8s TypeScript types
├── examples/              # Usage examples
│   ├── with-stack-template/
│   ├── with-secret-manager/
│   └── with-custom-type-secret/
├── tools/                 # Build tools
│   └── mono/              # Build wrapper
└── configs/               # Shared configs
    ├── config-eslint/
    ├── config-typescript/
    └── config-vitest/
```

### Package Responsibilities

```mermaid
graph TD
    A[kubricate CLI] --> B[core]
    A --> C[stacks]
    A --> D[toolkit]
    A --> E[plugin-kubernetes]
    A --> F[plugin-env]
    E --> B
    F --> B
    C --> B
    E --> G[kubernetes-models]
```

| Package | Responsibility | Exports |
|---------|---------------|---------|
| `kubricate` | CLI, commands, orchestration | `Stack`, `SecretManager`, `defineConfig` |
| `@kubricate/core` | Base classes, types, interfaces | `BaseProvider`, `BaseConnector`, types |
| `@kubricate/stacks` | Reusable stack templates | `simpleAppTemplate`, `namespaceTemplate` |
| `@kubricate/plugin-kubernetes` | K8s secret providers | `OpaqueSecretProvider`, `CustomTypeSecretProvider` |
| `@kubricate/plugin-env` | .env file connector | `EnvConnector` |
| `@kubricate/toolkit` | Utility functions | Helper functions |
| `@kubricate/kubernetes-models` | K8s TypeScript types | Type definitions |

## Package Dependencies

### Fixed Versioning
These packages **must always be on the same version**:
- `kubricate`
- `@kubricate/core`
- `@kubricate/stacks`

### Independent Versioning
Plugins can have independent versions:
- `@kubricate/plugin-*`
- `@kubricate/toolkit`

### Dependency Rules

**Runtime dependencies** (`dependencies`):
- Use when you import and execute code from the package
- Example: `kubricate` depends on `@kubricate/core`

**Peer dependencies** (`peerDependencies` + `devDependencies`):
- Use for type-only dependencies
- Prevents nested version conflicts
- Example: Providers depend on `@kubricate/core` as peer

## Core Architecture

### High-Level Overview

```mermaid
graph TB
    User[User] -->|kubricate.config.ts| Config[Configuration Loader]
    Config -->|loads| SM[Secret Managers]
    Config -->|loads| Stacks[Stacks]

    subgraph "Secret System"
        SM -->|uses| Conn[Connectors]
        SM -->|uses| Prov[Providers]
        Conn -->|loads from| Source[.env/Vault/AWS]
        Prov -->|creates| Secret[K8s Secrets]
    end

    subgraph "Stack System"
        Stacks -->|uses| Templates[Stack Templates]
        Stacks -->|manages| Resources[Resources]
        Resources -->|via| RC[ResourceComposer]
    end

    SM -->|injects into| Resources
    Resources -->|renders to| YAML[Kubernetes YAML]
    Secret -->|renders to| YAML
```

### Layer Architecture

Kubricate follows a **layered architecture**:

```
┌─────────────────────────────────────────────────┐
│            CLI Layer (bin.mjs)                   │
│  - Argument parsing (yargs)                      │
│  - Command routing                               │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Command Layer (commands/)                │
│  - SecretCommand (validate, apply)               │
│  - GenerateCommand                               │
│  - ConfigLoader                                  │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│      Orchestration Layer (orchestrators/)        │
│  - SecretsOrchestrator                           │
│  - SecretManagerEngine                           │
│  - Stack composition logic                       │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Domain Layer (stack/, secret/)           │
│  - Stack                                         │
│  - SecretManager                                 │
│  - ResourceComposer                              │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│       Plugin Layer (plugins/)                    │
│  - Connectors (EnvConnector)                     │
│  - Providers (OpaqueSecretProvider, etc.)        │
│  - Stack Templates (simpleAppTemplate)           │
└──────────────────────────────────────────────────┘
```

## Design Principles

### 1. **Type Safety First**

Every API is fully typed using TypeScript:

```typescript
// Good: Type-safe provider
class CustomTypeSecretProvider
  implements BaseProvider<CustomTypeSecretProviderConfig, SupportedStrategies> {
  // TypeScript enforces correct implementation
}

// Provider ensures injection strategies are valid
.inject('env', { key: 'api_key' })  // ✓ Type-checked
.inject('invalid', { })              // ✗ Compile error
```

### 2. **Separation of Concerns**

Each component has a single, clear responsibility:

| Component | Responsibility | Does NOT |
|-----------|---------------|----------|
| Connector | Load secret values | Format or validate values |
| Provider | Format and validate values | Load from sources |
| SecretManager | Orchestrate connectors & providers | Know about Kubernetes |
| Stack | Compose resources | Render YAML directly |
| ResourceComposer | Manage resource metadata | Know about secrets |

### 3. **Pluggability**

Users can extend the framework without modifying core code:

```typescript
// Custom connector
class VaultConnector extends BaseConnector {
  async load(name: string) {
    return await vault.getSecret(name);
  }
}

// Custom provider
class HelmSecretProvider extends BaseProvider {
  prepare(name: string, value: any) {
    return [{ type: 'helm', value: { ... } }];
  }
}

// Use in config
const secretManager = new SecretManager()
  .addConnector('vault', new VaultConnector())
  .addProvider('helm', new HelmSecretProvider());
```

### 4. **Declarative Configuration**

Users describe **what** they want, not **how** to do it:

```typescript
// Declarative: User describes the desired state
const stack = Stack.fromTemplate(simpleAppTemplate, { ... })
  .useSecrets(secretManager, c => {
    c.secrets('DB_PASSWORD').forName('DATABASE_PASSWORD').inject('env');
  });

// Framework handles:
// - Loading secret from connector
// - Validating with provider
// - Injecting into deployment
// - Creating Kubernetes Secret
// - Rendering YAML
```

### 5. **Fail-Fast Validation**

Errors are caught as early as possible:

```mermaid
graph LR
    A[Config Load] -->|Invalid config| E1[Error]
    A --> B[Validate Structure]
    B -->|Missing provider| E2[Error]
    B --> C[Load Secrets]
    C -->|Missing .env| E3[Error]
    C --> D[Prepare Secrets]
    D -->|Invalid keys| E4[Error]
    D --> F[Merge & Apply]
```

## Key Patterns

### 1. **Single Configuration File (`defineConfig`)**

Inspired by **Vite** and **Vitest**, Kubricate uses `defineConfig()` to provide a **single source of truth** for all project configuration. This approach centralizes stacks, secrets, metadata, and generation options in one type-safe file.

```typescript
// kubricate.config.ts
import { defineConfig } from 'kubricate';
import { secretManager } from './src/setup-secrets';
import { frontend, backend } from './src/stacks';

export default defineConfig({
  // All your stacks
  stacks: {
    frontend,
    backend,
  },

  // Secret management configuration
  secret: {
    secretSpec: secretManager,
    conflict: {
      strategies: {
        intraProvider: 'autoMerge',  // Merge secrets within same provider
        crossProvider: 'error',       // Error on cross-provider conflicts
        crossManager: 'error',        // Error on cross-manager conflicts
      },
    },
  },

  // Metadata injection settings
  metadata: {
    inject: true,                    // Auto-inject Kubricate metadata
    injectManagedAt: true,           // Timestamp tracking
    injectResourceHash: true,        // Content hash for drift detection
    injectVersion: true,             // Kubricate version tracking
  },

  // Output generation settings
  generate: {
    outputType: 'stack',             // 'stack' | 'resource' | 'flat'
    outputDir: './manifests',
  },
});
```

**Benefits:**

1. **Type Safety**: Full TypeScript autocomplete and validation
   ```typescript
   defineConfig({
     stacks: { myStack },           // ✓ Type-checked
     unknownOption: true,            // ✗ Compile error
   });
   ```

2. **Centralized Discovery**: All configuration in one place
   - No scattered config files
   - Easy to understand project structure
   - Single file to review in code reviews

3. **Framework Integration**: Loaded automatically by CLI
   ```bash
   kubricate generate    # Automatically finds kubricate.config.ts
   kubricate secret apply
   ```

4. **Flexible Loading**: Uses `unconfig` library for multiple formats
   - `kubricate.config.ts` (TypeScript, recommended)
   - `kubricate.config.js` (JavaScript)
   - `kubricate.config.mjs` (ESM)
   - Support for `.mts`, `.cjs`, `.cts` variants

5. **Environment-Specific Overrides**: Easy to create variants
   ```typescript
   // kubricate.config.prod.ts
   import baseConfig from './kubricate.config';

   export default defineConfig({
     ...baseConfig,
     metadata: {
       ...baseConfig.metadata,
       injectManagedAt: false,  // Override for production
     },
   });
   ```

**Design Philosophy:**

Like Vite and Vitest, `defineConfig()` is a simple identity function that returns its input unchanged:

```typescript
export function defineConfig(config: KubricateConfig): KubricateConfig {
  return config;
}
```

Its purpose is **not** runtime transformation, but rather:
- Providing TypeScript IntelliSense and type checking
- Serving as a clear, documented API contract
- Making configuration files self-documenting

**CLI Integration:**

The CLI automatically discovers and loads the config file:

```mermaid
graph LR
    A[CLI Command] -->|unconfig| B[Load kubricate.config.ts]
    B --> C[Validate Config]
    C --> D[Extract Stacks]
    C --> E[Extract Secret Managers]
    C --> F[Extract Options]
    D --> G[Execute Command]
    E --> G
    F --> G
```

This pattern ensures that:
- Users have one place to configure everything
- The framework has one source to read from
- Configuration is type-safe and validated early
- No magic globals or environment variables required

### 2. **Base Classes for Extension**

All plugins extend base classes from `@kubricate/core`:

```typescript
// Core package defines interface
export abstract class BaseProvider<TConfig, TStrategies> {
  abstract prepare(name: string, value: any): PreparedEffect[];
  abstract getInjectionPayload(injectes: ProviderInjection[]): any;
  abstract mergeSecrets(effects: PreparedEffect[]): PreparedEffect[];
}

// Plugin implements
export class CustomTypeSecretProvider
  extends BaseProvider<CustomTypeSecretProviderConfig, 'env' | 'envFrom'> {
  prepare(name: string, value: Record<string, string>) {
    // Implementation
  }
}
```

### 3. **Effect-Based Side Effects**

Side effects are represented as data structures (effects) that are executed later:

```typescript
// Provider returns "effects" (data), doesn't execute kubectl
prepare(name: string, value: string): PreparedEffect[] {
  return [{
    type: 'kubectl',        // Effect type
    secretName: name,
    value: {                // Effect payload
      apiVersion: 'v1',
      kind: 'Secret',
      data: { ... }
    }
  }];
}

// Later, executor handles the effect
for (const effect of effects) {
  if (effect.type === 'kubectl') {
    await kubectl.apply(effect.value);
  }
}
```

**Benefits:**
- Testable (inspect effects without executing)
- Composable (merge, filter, transform effects)
- Dry-run friendly (show what would happen)

### 4. **Builder Pattern for Configuration**

Fluent APIs make configuration readable:

```typescript
const secretManager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('opaque', new OpaqueSecretProvider({ name: 'my-secret' }))
  .setDefaultConnector('env')
  .setDefaultProvider('opaque')
  .addSecret({ name: 'DB_PASSWORD' });

const stack = Stack.fromTemplate(simpleAppTemplate, { name: 'my-app' })
  .useSecrets(secretManager, c => {
    c.secrets('DB_PASSWORD').forName('DATABASE_PASSWORD').inject('env');
  })
  .override({ service: { spec: { type: 'LoadBalancer' } } });
```

### 5. **Template Pattern for Stacks**

Stacks are created from reusable templates:

```typescript
// Template is a function that returns resources
export const simpleAppTemplate: StackTemplate = (input) => {
  return {
    deployment: createDeployment(input),
    service: createService(input)
  };
};

// Users instantiate from template
const stack = Stack.fromTemplate(simpleAppTemplate, {
  name: 'my-app',
  imageName: 'nginx',
  namespace: 'production'
});

// Framework processes template → generates resources
```

### 6. **Merge Strategies for Conflicts**

When multiple secrets target the same resource, merge strategies control behavior:

```typescript
// User configures conflict resolution
defineConfig({
  secret: {
    conflict: {
      strategies: {
        intraProvider: 'autoMerge',  // Same provider → merge
        crossProvider: 'error',       // Different providers → error
        crossManager: 'error',        // Different managers → error
      }
    }
  }
});

// Framework automatically handles merging based on strategy
```

## Component Interaction Flow

### Example: Generate Command with Secrets

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant ConfigLoader
    participant Stack
    participant SecretManager
    participant Connector
    participant Provider
    participant ResourceComposer
    participant Renderer

    User->>CLI: kubricate generate
    CLI->>ConfigLoader: Load kubricate.config.ts
    ConfigLoader->>Stack: Create stacks
    ConfigLoader->>SecretManager: Create secret managers

    Stack->>SecretManager: useSecrets(manager, injector)
    Stack->>SecretManager: Request secret injection

    SecretManager->>Connector: load('DB_PASSWORD')
    Connector->>Connector: Read .env file
    Connector-->>SecretManager: return 'secret-value'

    SecretManager->>Provider: prepare('DB_PASSWORD', 'secret-value')
    Provider->>Provider: Validate value (allowedKeys, etc.)
    Provider-->>SecretManager: return PreparedEffect[]

    SecretManager->>Provider: getInjectionPayload(injections)
    Provider-->>SecretManager: return EnvVar[]

    SecretManager-->>Stack: Secret ready for injection

    Stack->>ResourceComposer: Compose resources
    ResourceComposer->>ResourceComposer: Inject secrets into resources
    ResourceComposer->>ResourceComposer: Add metadata & annotations
    ResourceComposer-->>Stack: return composed resources

    Stack->>Renderer: Render to YAML
    Renderer-->>User: Write output files
```

## Testing Strategy

### Unit Tests
- Test individual classes in isolation
- Mock dependencies
- Fast execution (<1s per test suite)

```typescript
// Example: Provider unit test
test('should validate allowedKeys', () => {
  const provider = new CustomTypeSecretProvider({
    allowedKeys: ['api_key']
  });

  expect(() => {
    provider.prepare('TEST', { invalid_key: 'value' });
  }).toThrow(/invalid_key.*not allowed/);
});
```

### Integration Tests
- Test interactions between components
- Use real implementations (not mocks)
- Example: Stack + SecretManager integration

```typescript
// Example: Integration test
test('should inject secrets into deployment', async () => {
  const manager = new SecretManager()
    .addConnector('env', new EnvConnector())
    .addProvider('opaque', new OpaqueSecretProvider({ name: 'test' }));

  const stack = Stack.fromTemplate(simpleAppTemplate, { name: 'app' })
    .useSecrets(manager, c => {
      c.secrets('PASSWORD').inject('env');
    });

  const resources = await stack.compose();
  expect(resources.deployment.spec.template.spec.containers[0].env).toContainEqual({
    name: 'PASSWORD',
    valueFrom: { secretKeyRef: { name: 'test', key: 'PASSWORD' } }
  });
});
```

### End-to-End Tests
- Test full CLI commands
- Use real examples
- Verify output files

## Performance Considerations

### Build System
- **Turbo cache**: Skips unchanged packages
- **Parallel builds**: Independent packages build concurrently
- **Incremental TypeScript**: Only recompiles changed files

### Runtime
- **Lazy loading**: Only load secrets when needed
- **Single pass**: Secrets loaded once per apply
- **Efficient merging**: O(n) merge operations

## Next Steps

- [Secret Management Deep Dive](./secret-management-deep-dive.md) - Learn the secrets system
- [Generate Workflow](./generate-workflow.md) - Understand stack generation
- [Command Flows](./command-flows.md) - Debug CLI commands
