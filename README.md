<p align="center">
  <a href="https://github.com/thaitype/kubricate">
    <img src="https://i.ibb.co/hJTg9vhs/kubricate-logo.png" alt="kubricate-logo" width="120" />
  </a>
</p>

<h2 align="center">Kubricate</h2>

<p align="center">
  A TypeScript-powered framework to define and compose Kubernetes manifests with reusable Stacks and mergeable Secrets
</p>

<!-- Helm chart compatibility: Add later, see in https://github.com/thaitype/kubricate/issues?q=is%3Aissue%20state%3Aopen%20helm -->

<p align="center">
  <a href="https://github.com/thaitype/kubricate/actions/workflows/test-and-build.yml">
    <img src="https://github.com/thaitype/kubricate/actions/workflows/test-and-build.yml/badge.svg" alt="Build">
  </a>
  <a href="https://codecov.io/gh/thaitype/kubricate" > 
    <img src="https://codecov.io/gh/thaitype/kubricate/graph/badge.svg?token=DIBHOOVLDA"/> 
 </a>
  <a href="https://www.npmjs.com/package/kubricate">
    <img alt="NPM Version" src="https://img.shields.io/npm/v/kubricate">
  </a>
  <a href="https://www.npmjs.com/package/kubricate">
    <img src="https://img.shields.io/npm/dt/kubricate" alt="npm downloads">
  </a>
</p>

> ⚠️ Evolving API: Kubricate has been tested in internal environments and many parts are stable with test coverage. However, the project is still evolving as we design use cases around real-world Kubernetes pain points.
>
> Kubricate is not here to replace the great tools in the Kubernetes ecosystem—but to improve the developer experience around YAML templating, type safety, and reuse.
> 
> Expect frequent API changes. Please follow [issues](https://github.com/thaitype/kubricate/issues) for proposed features and [pull requests](https://github.com/thaitype/kubricate/pulls) for updates on documentation and migration plans.

## ✨ Features

- **📦 Type-safe Kubernetes Manifest Generation**: Define Kubernetes resources using fully-typed TypeScript objects — with support for reuse, composition, and validation in your IDE.

- **🧱 Stack-Based Architecture**: Group related resources together into reusable **Stacks** — such as `Deployment + Service`, or `Namespace + RoleBinding`. Easily parameterize and extend them across environments.

- **🔐 Declarative Secret Management**: Declare secrets with `addSecret({ name })`, and hydrate them from multiple backends like `.env`, Azure Key Vault, 1Password, or Vault — all within your CI/CD pipeline.

<!-- ### 🔄 Secret Hydration Plans  
Define **hydration plans** to control where secrets come from and where they go — perfect for syncing between `.env` → Azure KV or Vault → K8s Secrets. -->

- **♻️ Connectors and Providers**: Use **Connectors** to read/write secrets from systems, and **Providers** to convert secrets into Kubernetes-native resources (like `Secret`, `ConfigMap`, or `ExternalSecret`).

- **🚀 CLI-Friendly & GitOps Ready**: Run `kubricate generate` <!--,  `kubricate secrets hydrate`, --> and `kubricate secrets plan` to validate, sync, and render your infrastructure as YAML — without running anything in your cluster.

- **🧪 First-Class Dev Experience**: Enjoy full IDE autocomplete, refactor support, type checking, and linting across your entire platform configuration — all in TypeScript.


## 🧭 Motivation

### 💥 The Problem

Secret management in Kubernetes is fragmented, repetitive, and error-prone. In production environments, teams often deal with:

- Manually duplicating `Secret` manifests across environments
- Templating secret references with Helm or Kustomize
- Managing complex `ExternalSecret` or `Vault` annotations spread across YAML files
- Relying on runtime injectors or sidecars with unclear debugging paths
- No clear way to track which secrets are used, where they come from, or who owns them

These patterns result in:

- ❌ Too much untyped YAML
- ❌ Difficult-to-test deployments
- ❌ Poor visibility into secret flow
- ❌ Secrets being treated as runtime config, not infrastructure

### 🔍 Existing Solutions (and Limitations)

| Tool                    | Strengths                                   | Weaknesses                                                     |
|-------------------------|----------------------------------------------|----------------------------------------------------------------|
| **External Secrets Operator (ESO)** | Reconciles secrets from cloud backends | Heavy YAML usage, CRDs, hard to reuse or test                 |
| **Vault Agent Injector** | Dynamic injection at runtime                | Requires sidecars, annotations, Vault policy setup             |
| **SOPS / Sealed Secrets** | GitOps-safe encryption                     | Complex rotation/versioning, no unified source of truth        |
| **Helm values + `.env`** | Familiar templating                         | No type safety, validation, or traceability                    |


### 💡 Kubricate’s Approach

Kubricate doesn't replace those tools — it replaces the **YAML, glue logic, and guesswork** needed to make them work.

Instead of defining secrets across many `values.yaml`, CRDs, and annotations, Kubricate gives you:

- ✅ Type-safe secret declarations in code: `addSecret({ name: 'API_KEY' })`
- ✅ Secret hydration plans that describe where secrets come from and where they go
- ✅ Plug-in **Connectors** to load secrets from `.env`, 1Password, Vault, or any backend
- ✅ The ability to generate YAML, `ExternalSecret` CRDs, or annotations with confidence

Kubricate focuses on **design-time control**, not runtime magic:
- You define the truth in TypeScript
- You hydrate secrets as part of your pipeline
- You generate manifests, not YAML by hand

Whether you're using ArgoCD, ESO, Vault, or no controller at all — Kubricate makes the configuration safe, testable, and understandable by everyone on your team.

---

## Getting Started

```bash
npm install -D kubricate
npm install @kubricate/core
```

If you want Kubernetes resource types in TypeScript, install `kubernetes-models`. It helps generate fully-typed resource objects.

```bash
npm install -D kubernetes-models
```

Then, create your first Kubricate Stack. Kubricate Stacks help you define, reuse, and manage Kubernetes resources in a clean, declarative way.

### 🧱 Example: Creating a Namespace Stack

```ts
// File: src/my-stack.ts
import { createStack, ResourceComposer } from '@kubricate/core';
import { Namespace } from 'kubernetes-models/v1';

// Step 1: declare data schema
interface MyInput {
  name: string;
}

// Step 2: define stack shape for reusable work
const MyStack = createStack('MyStack', (data: MyInput) =>
  new ResourceComposer().addClass({
    id: 'namespace',
    type: Namespace,
    config: {
      metadata: { name: data.name },
    },
  })
);

// Usage: configure the stack with your own input
envexport const myStack = MyStack.from({
  name: 'my-namespace',
});
```

### ⚙️ Configure with `kubricate.config.ts`

Create a `kubricate.config.ts` file at the root of your project:

```ts
import { defineConfig } from 'kubricate';
import { myStack } from './src/MyStack';

export default defineConfig({
  stacks: {
    myStack,
  },
});
```

### 🚀 Generate Kubernetes Resources

```bash
npx kubricate generate
```

This will generate Kubernetes YAML files in the `.kubricate` folder:

```bash
✔ YAML file successfully written to:
  ~/with-custom-stack/.kubricate/stacks.yml
```

See the full working example: [`with-custom-stack`](https://github.com/thaitype/kubricate/tree/main/examples/with-custom-stack)

Kubricate offers a type-safe developer experience for building Kubernetes manifests. It works with your existing resources, supports secret injection through connectors like `EnvConnector`, and prevents exposing secrets in YAML.

---

## Packages

- `kubricate` – CLI for configuration and manifest generation
- `@kubricate/core` – Core framework for creating and managing stacks
- `@kubricate/env` – Secret connector for `.env` and environment variables
- `@kubricate/kubernetes` – Kubernetes connectors
- `@kubricate/stacks` – Official reusable stack definitions
- `@kubricate/toolkit` – Utility functions for custom stack authors

## Version Compatibility

Ensure the following packages are always on the same version when upgrading:

- `kubricate`
- `@kubricate/core`
- `@kubricate/env`
- `@kubricate/kubernetes`
- `@kubricate/stacks`

## Documentation & Examples

Explore the [`examples`](https://github.com/thaitype/kubricate/tree/main/examples) directory for real-world usage patterns and advanced features.

## Development

To develop Kubricate:

```bash
pnpm install
pnpm build
pnpm dev
```

This installs dependencies and starts TypeScript in watch mode.

To run the examples run with

```sh
pnpm --filter=@examples/with-custom-stack kubricate generate
```

## How to Publish

1. Run `pnpm changeset` and select the packages to version
2. Commit and push the changes
3. GitHub Actions will open a release PR
4. Review and approve the PR
5. The packages will be published to NPM automatically


