<p align="center">
  <a href="https://github.com/thaitype/kubricate">
    <img src="https://i.ibb.co/hJTg9vhs/kubricate-logo.png" alt="kubricate-logo" width="120" />
  </a>
</p>

<h2 align="center">Kubricate</h2>

<p align="center">
  A TypeScript framework for building, managing, and compiling Kubernetes resources with a structured, reusable, and Helm-compatible approach.
</p>

<p align="center">
  <a href="https://github.com/thaitype/kubricate/actions/workflows/test-and-build.yml">
    <img src="https://github.com/thaitype/kubricate/actions/workflows/test-and-build.yml/badge.svg" alt="Build">
  </a>
  <a href="https://www.npmjs.com/package/kubricate">
    <img alt="NPM Version" src="https://img.shields.io/npm/v/kubricate">
  </a>
  <a href="https://www.npmjs.com/package/kubricate">
    <img src="https://img.shields.io/npm/dt/kubricate" alt="npm downloads">
  </a>
</p>

> ⚠️ Experimental: This project is still in early development and not ready for production use.

## Features

- 📦 Type-safe Kubernetes manifest generation with TypeScript
- ♻️ Reusable, composable stack system
- 🔐 Secrets injection via `SecretManager` and loaders (e.g., `.env`, process.env)

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

Kubricate offers a type-safe developer experience for building Kubernetes manifests. It works with your existing resources, supports secret injection through loaders like `EnvLoader`, and prevents exposing secrets in YAML.

---

## Packages

- `kubricate` – CLI for configuration and manifest generation
- `@kubricate/core` – Core framework for creating and managing stacks
- `@kubricate/env` – Secret loader for `.env` and environment variables
- `@kubricate/stacks` – Official reusable stack definitions
- `@kubricate/toolkit` – Utility functions for custom stack authors

## Version Compatibility

Ensure the following packages are always on the same version when upgrading:

- `kubricate`
- `@kubricate/core`
- `@kubricate/env`
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
```

