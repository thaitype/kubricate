# @kubricate/stacks

install official stacks from the kubricate projects

## Install

```bash
npm install @kubricate/stacks
```

## Usage

Currently, kubricate needs `kosko` to build the output into kube manifests yaml files. See the [kosko documentation](https://kosko.dev) for more information.

place this file in to `components/MyApp.ts`:

```ts
import { SimpleAppStack, NamespaceStack } from "@kubricate/stacks";

const namespace = new NamespaceStack()
  .configureStack({
    name: "my-namespace"
  }).build();

const myApp = new SimpleAppStack()
  .configureStack({
    imageName: "nginx",
  })
  .overrideResources({
    service: {
      spec: {
        type: "LoadBalancer"
      }
    }
  })
  .build();

export default [namespace, myApp];
```

setup cosko config at `kosko.toml`, P.S. This for CommonJS

```toml
require = ["ts-node/register"]
```

for the ESM, using

```toml
loaders = ["ts-node/esm"]
extensions = ["ts", "mts", "cjs", "mjs", "js", "json"]
```

then run `npx kosko generate "*"` to generate all components into the kube manifests.