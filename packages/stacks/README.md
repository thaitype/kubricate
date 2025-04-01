# @kubricate/stacks

Official stack definitions for [kubricate](https://github.com/thaitype/kubricate), designed to simplify building Kubernetes resources in a structured and reusable way.

## Installation

```bash
pnpm install @kubricate/stacks 
pnpm install -D @kubernetes-models/base@^5.0.1
```

`@kubernetes-models/base` is a required peer dependency.
Please install it manually to ensure compatibility.

## Usage

Currently, kubricate uses Kosko to compile stacks into Kubernetes resource YAML files.

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

### Generate Kubernetes Resources

Run the following command to generate resources from all components:

```
npx kubricate generate
```