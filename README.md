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

### The Problem: Secret Management in Kubernetes Is a Mess

In modern Kubernetes setups, managing secrets across environments often leads to one of these:

- Manually writing and syncing Kubernetes `Secret` YAML files
- Relying on **External Secrets Operator (ESO)**, with scattered `ExternalSecret` and `SecretStore` CRDs
- Using **Vault Agent Injector**, with complex `annotations`, Vault policies, and runtime dependencies
- Injecting secrets via environment variables or hardcoded `.env` values

These tools work — but introduce real pain:

- ❌ **Too much YAML** — repetitive, hard to validate, easy to break  
- ❌ **Poor dev experience** — secrets feel disconnected from app config  
- ❌ **Lack of type safety** — no validation until deploy time  
- ❌ **Unclear ownership** — devs vs. ops vs. platform teams  
- ❌ **Secret sprawl** — no single source of truth across environments

### 🔍 Comparison: Existing Secret Solutions

| Tool                  | Strengths                                | Weaknesses                                                   |
|-----------------------|-------------------------------------------|---------------------------------------------------------------|
| **ESO**               | Reconciles secrets from cloud backends     | CRD-driven, verbose YAML, hard to validate, poor dev UX       |
| **Vault Agent Injector** | Dynamic runtime injection               | Requires sidecars, policies, annotations, tied to runtime     |
| **Sealed Secrets / SOPS** | GitOps-friendly encryption             | Secret versioning, rotation, and source mapping is manual     |
| **Helm `values.yaml`** | Simple templating                         | No validation, weak typing, still YAML                        |


### 💡 How Kubricate Solves It

Kubricate introduces a **framework-level secret model** — where secrets are declared, typed, validated, and hydrated using TypeScript, not YAML.

#### What Kubricate does differently:

- ✅ Secrets are **declared in code**: `addSecret({ name: 'API_KEY' })`
- ✅ Secrets are **hydrated from source connectors** (e.g. `.env`, 1Password)
- ✅ Secret values can be **written to other systems** like Azure Key Vault
- ✅ You **generate ESO manifests**, Vault annotations, or K8s Secrets — with full control
- ✅ Hydration is **declarative**, CLI-driven, and CI-friendly — no sidecars or CRDs

#### No Operators. No Sidecars. No Runtime Magic.

Kubricate puts you back in control:
- You **own the secret plan** at build-time.
- You **know exactly where secrets come from and where they go**.
- You can **test, validate, and generate manifests** from a consistent API.


### 🧩 Use It With:
- **ESO**: Kubricate can generate `ExternalSecret` CRDs cleanly
- **Vault Agent**: Generate annotations in a reusable, type-safe way
- **ArgoCD / Flux**: Use `kubricate generate` to output manifests for GitOps
- **No controller at all**: Just hydrate secrets from `.env` into YAML or Azure KV

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


