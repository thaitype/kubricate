# @kubricate/stacks

Official stack definitions for [kubricate](https://github.com/thaitype/kubricate), designed to simplify building Kubernetes manifests in a structured and reusable way.

## Installation

```bash
pnpm install @kubricate/stacks 
pnpm install -D @kubernetes-models/base@^5.0.1 kosko @kosko/env ts-node
```

`@kubernetes-models/base` is a required peer dependency.
Please install it manually to ensure compatibility.

## Usage

Currently, kubricate uses Kosko to compile stacks into Kubernetes manifest YAML files.

Create a component file at `components/MyApp.ts`:

```typescript
import { SimpleAppStack, NamespaceStack } from "@kubricate/stacks";

const namespace = new NamespaceStack()
  .configureStack({
    name: "my-namespace"
  })
  .build();

const myApp = new SimpleAppStack()
  .configureStack({
    imageName: "nginx",
    name: "my-app"
  })
  .overrideStack({
    service: {
      spec: {
        type: "LoadBalancer"
      }
    }
  })
  .build();

export default [namespace, myApp];
```

### Kosko Configuration

For CommonJS

In your kosko.toml:

```toml
require = ["ts-node/register"]
```

For ESM

```toml
loaders = ["ts-node/esm"]
extensions = ["ts", "mts", "cjs", "mjs", "js", "json"]
```

### Generate Kubernetes Manifests

Run the following command to generate manifests from all components:

```
npx kosko generate "*"
```