# 🚀 Contributor Guide

Welcome to the Kubricate contributor documentation! This guide will help you understand how the framework works internally so you can contribute effectively.

## 📚 Documentation Structure

This directory contains in-depth technical documentation for contributors:

### 1. [Architecture Overview](./architecture-overview.md)
**Start here!** Understand the big picture:
- Monorepo structure
- Core packages and their responsibilities
- Key design patterns and principles
- How packages interact with each other

### 2. [Secret Management Deep Dive](./secret-management-deep-dive.md)
Learn how secrets flow through the system:
- Connector vs Provider architecture
- SecretManager orchestration
- Validation levels (connector vs provider)
- Secret lifecycle from .env to Kubernetes

### 3. [Generate Workflow](./generate-workflow.md)
Understand how `kubricate generate` works:
- Stack composition and templates
- Resource generation pipeline
- YAML rendering and output modes
- Resource metadata and annotations

### 4. [Command Flows](./command-flows.md)
See how CLI commands execute:
- Command routing and execution
- `kubricate secret validate` vs `apply`
- `kubricate generate` internals
- Error handling and logging

## 🎯 Quick Navigation

### I want to...

**Understand the framework architecture**
→ Start with [Architecture Overview](./architecture-overview.md)

**Work on secret providers or connectors**
→ Read [Secret Management Deep Dive](./secret-management-deep-dive.md)

**Understand stack generation**
→ See [Generate Workflow](./generate-workflow.md)

**Debug a CLI command**
→ Check [Command Flows](./command-flows.md)

**Add a new secret provider**
→ See [Secret Management Deep Dive](./secret-management-deep-dive.md#creating-a-new-provider)

**Add a new stack template**
→ See [Generate Workflow](./generate-workflow.md#creating-stack-templates)

## 🏗️ Architecture Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubricate Framework                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  CLI Layer   │────────▶│  Commands    │                 │
│  │  (bin.mjs)   │         │  (generate,  │                 │
│  │              │         │   secret)    │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                          │
│                    ┌──────────────┴──────────────┐          │
│                    │                             │          │
│         ┌──────────▼──────────┐    ┌────────────▼─────┐   │
│         │  Stack Orchestrator │    │ Secret Orchestrator│   │
│         │  - ResourceComposer │    │ - SecretsEngine    │   │
│         │  - Template System  │    │ - Validation       │   │
│         └──────────┬──────────┘    └────────────┬─────┘   │
│                    │                             │          │
│         ┌──────────▼──────────┐    ┌────────────▼─────┐   │
│         │     Stacks          │    │  SecretManager   │   │
│         │  - SimpleAppStack   │    │  - Connectors    │   │
│         │  - NamespaceStack   │    │  - Providers     │   │
│         └──────────┬──────────┘    └────────────┬─────┘   │
│                    │                             │          │
│         ┌──────────▼─────────────────────────────▼─────┐   │
│         │         Kubernetes Manifests                  │   │
│         │         (Deployment, Service, Secret, etc.)   │   │
│         └──────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Development Workflow

1. **Clone and install**
   ```bash
   git clone <repo>
   pnpm install
   pnpm build
   ```

2. **Run tests**
   ```bash
   pnpm test                    # All tests
   pnpm test:watch              # Watch mode
   pnpm test --filter=<package> # Specific package
   ```

3. **Build packages**
   ```bash
   pnpm build                   # All packages
   pnpm build --filter=<package> # Specific package
   ```

4. **Run examples**
   ```bash
   cd examples/<example-name>
   pnpm kubricate generate
   ```

5. **Lint and format**
   ```bash
   pnpm lint:check              # Check issues
   pnpm lint:fix                # Fix issues
   pnpm format:fix              # Format code
   ```

## 📦 Key Packages

| Package | Purpose | Location |
|---------|---------|----------|
| `kubricate` | CLI & core orchestration | `packages/kubricate/` |
| `@kubricate/core` | Base classes & types | `packages/core/` |
| `@kubricate/stacks` | Official stack templates | `packages/stacks/` |
| `@kubricate/plugin-kubernetes` | K8s secret providers | `packages/plugin-kubernetes/` |
| `@kubricate/plugin-env` | .env connector | `packages/plugin-env/` |

## 🔑 Key Concepts

### Stack
A composable unit representing one or more Kubernetes resources. Can be created from templates or static resources.

### SecretManager
Orchestrates secret loading (from connectors) and delivery (to providers). Each stack can use multiple SecretManagers.

### Connector
Loads secret values from external sources (.env files, cloud providers, etc.).

### Provider
Converts secrets into Kubernetes resources or injection strategies.

### ResourceComposer
Manages resource metadata, composition, and rendering.

## 🎨 Code Style

- TypeScript with strict mode
- ESLint + Prettier
- Vitest for testing
- Conventional commits
- Changesets for versioning

## 🐛 Debugging Tips

### Enable debug logging
```bash
DEBUG=kubricate:* pnpm kubricate generate
```

### Run with stack trace
```bash
NODE_ENV=development pnpm kubricate generate
```

### Test specific provider
```bash
cd packages/plugin-kubernetes
pnpm test CustomTypeSecretProvider
```

## 📖 Additional Resources

- [Main README](../../README.md) - User documentation
- [CLAUDE.md](../../CLAUDE.md) - Project overview for AI assistants
- [Secrets Documentation](../secrets.md) - User-facing secrets guide
- [Conflict Resolution](../conflict-resolution-on-orchestrator-phase.md) - Secret merging strategies
- [Monorepo Maintenance](../monorepo-maintenance-guide.md) - Repo management

## 🤝 Contributing

1. Read through the architecture docs
2. Check existing issues or create a new one
3. Fork and create a feature branch
4. Write tests for your changes
5. Submit a PR with a clear description

## ❓ Questions?

- Check the docs in this directory
- Look at existing code and tests
- Ask in GitHub issues or discussions

Happy contributing! 🎉
