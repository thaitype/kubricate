# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kubricate** is a TypeScript framework for building reusable, type-safe Kubernetes infrastructure without YAML. It provides:

- Type-safe Kubernetes manifest generation using fully-typed TypeScript
- Stack-based architecture for grouping and reusing resources (e.g., Deployment + Service)
- Declarative secret management with hydration from multiple backends (.env, Azure Key Vault, 1Password, Vault)
- Connectors (read/write secrets) and Providers (convert to Kubernetes resources)
- CLI-friendly and GitOps-ready workflow

This is a **pnpm monorepo** using **Turbo** for build orchestration and **Changesets** for versioning.

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Build all packages (required before first run)
pnpm build

# Development mode (TypeScript watch mode, excludes examples)
pnpm dev

# Run specific example
pnpm --filter=@examples/with-stack-template kubricate generate
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# View test coverage report
pnpm test:view-report

# Generate coverage report
pnpm test:coverage
```

### Linting & Formatting

```bash
# Check linting and types
pnpm lint:check

# Fix linting issues
pnpm lint:fix

# Check formatting
pnpm format

# Fix formatting
pnpm format:fix

# Run all quality checks (build + lint + test)
pnpm all
```

### Running Tests for a Single Package

Each package uses the `mono` tool wrapper. From within a package directory:

```bash
# Run tests for current package only
pnpm test

# Watch mode for current package
pnpm test:watch
```

Or from root using Turbo filters:

```bash
turbo test --filter=@kubricate/core
turbo test --filter=kubricate
```

### CLI Usage

The main CLI is available as `kubricate` or the shorter alias `kbr`:

```bash
# Generate Kubernetes manifests from stacks
kubricate generate
# or
kbr generate

# Secret management commands
kubricate secret validate    # Validate connector/provider state
kubricate secret apply        # Apply secrets to providers
kubricate secret plan         # Preview hydration (WIP)
kubricate secret hydrate      # Execute hydration (WIP)
```

### Package Management & Versioning

```bash
# Create a changeset (required before publishing)
pnpm changeset

# Version packages and generate changelogs (done by CI)
changeset version

# Publish to npm (done by CI after PR merge)
changeset publish
```

## Architecture

### Monorepo Structure

```
packages/
├── core/                    # Base classes, orchestration, types (BaseConnector, BaseProvider)
├── kubricate/              # CLI entrypoint + Stack/SecretManager runtime
├── stacks/                 # Official reusable stack definitions (SimpleAppStack, NamespaceStack)
├── toolkit/                # Lightweight utility functions
├── plugin-env/             # EnvConnector (reads .env files)
├── plugin-kubernetes/      # OpaqueSecretProvider, DockerConfigSecretProvider
└── kubernetes-models/      # Kubernetes type definitions

examples/
├── with-stack-template/    # Basic stack example
├── with-secret-manager/    # Secret management example
└── with-sidecar-container/ # Advanced patterns

tools/
├── mono/                   # Build tool wrapper (uses @thaitype/mono-scripts)
└── template/               # Template for new packages

configs/
├── config-eslint/
├── config-typescript/
└── config-vitest/
```

### Core Concepts

#### 1. **Stack**
- Represents a group of Kubernetes resources (defined in `packages/kubricate/src/stack/Stack.ts`)
- Created via `Stack.fromTemplate(template, input)` or `Stack.fromStatic(name, resources)`
- Supports secret injection via `.useSecrets(secretManager, injector => {...})`
- Resources managed by `ResourceComposer` which handles resource metadata and composition

#### 2. **SecretManager**
- Central registry for secret lifecycle (defined in `packages/kubricate/src/secret/SecretManager.ts`)
- Coordinates **Connectors** (sources) and **Providers** (destinations)
- Supports multiple connectors/providers with default selection
- Orchestrates secret hydration, validation, and application via `SecretsOrchestrator`

#### 3. **Connector** (extends `BaseConnector` from `@kubricate/core`)
- Loads secret values from external sources (.env, Azure KV, Vault, etc.)
- Implements: `load()`, `save()`, `exists()`
- Examples: `EnvConnector`, `InMemoryConnector`

#### 4. **Provider** (extends `BaseProvider` from `@kubricate/core`)
- Converts secrets into Kubernetes-native resources or injection strategies
- Implements: `prepare()` (for kubectl apply), `getInjectionPayload()` (for manifest generation), `getTargetPath()`
- Examples: `OpaqueSecretProvider`, `DockerConfigSecretProvider`
- Supports injection kinds: `env`, `imagePullSecret`, `plugin` (volume/annotation/helm planned)

#### 5. **Configuration** (`kubricate.config.ts`)
- Uses `defineConfig()` to wire stacks and secret managers
- Loaded via `unconfig` library
- Exports: `{ stacks: {...}, secrets: { manager: ... } }`

### Key Files

- **`packages/kubricate/src/stack/Stack.ts`** - Core Stack implementation
- **`packages/kubricate/src/secret/SecretManager.ts`** - Secret orchestration
- **`packages/kubricate/src/secret/orchestrator/SecretsOrchestrator.ts`** - Secret lifecycle engine
- **`packages/core/src/BaseConnector.ts`** - Connector interface
- **`packages/core/src/BaseProvider.ts`** - Provider interface
- **`packages/kubricate/src/commands/`** - CLI command implementations

### Build System

- **Turbo** manages task execution and caching (see `turbo.json`)
- **`mono` tool** wraps TypeScript compilation via Babel for dual ESM/CJS output
- All packages emit to `dist/` with `esm/`, `cjs/`, and `dts/` subdirectories
- Build order enforced via `dependsOn: ["^build"]` in `turbo.json`

### Versioning & Publishing

- **Fixed versioning** for core packages: `kubricate`, `@kubricate/core`, `@kubricate/stacks`
  - These must always be on the same version
- **Independent versioning** for plugins (`@kubricate/plugin-*`) and other packages
- Changesets workflow:
  1. Run `pnpm changeset` and select packages to version
  2. Commit changeset markdown files
  3. CI opens a release PR
  4. Merging publishes to npm automatically

### Testing

- **Vitest** for all unit tests
- Shared config in `configs/config-vitest/`
- Test files colocated with source: `*.test.ts`
- Coverage uses Istanbul provider

## Important Conventions

### Package Dependencies

- **Runtime dependency**: Use `dependencies` if you call/extend `@kubricate/core` at runtime
- **Type-only dependency**: Use `peerDependencies` + `devDependencies` for interfaces/types only (avoids nested versions)

### Secret Management Flow

1. Register Connectors (sources like `.env`, Azure KV)
2. Register at least one Provider (e.g., `OpaqueSecretProvider`)
3. Set default connector/provider (if multiple)
4. Declare secrets via `secretManager.addSecret({ name })`
5. Define hydration plans (optional, WIP per issue #75)
6. Define Stack with `.useSecrets()` to inject secrets
7. Configure project in `kubricate.config.ts`
8. Run CLI: `kubricate generate`, `kubricate secret apply`, etc.

### CLI Structure

- Entrypoint: `packages/kubricate/bin.mjs` (supports both `kubricate` and `kbr` aliases)
- Uses `yargs` for argument parsing
- Commands in `packages/kubricate/src/commands/`
- Executors in `packages/kubricate/src/executor/`

## Known Issues & WIP

- Hydration Plan support is in progress (see [issue #75](https://github.com/thaitype/kubricate/issues/75))
- Some injection kinds are planned but not yet implemented: `volume`, `annotation`, `helm`
- See [v1 Milestone](https://github.com/thaitype/kubricate/milestone/1) for API stabilization progress

## Node Version

- Requires **Node.js >= 22** (see `package.json` engines field)
