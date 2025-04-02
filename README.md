<p align="center">
<a href="https://github.com/thaitype/kubricate"><img src="https://i.ibb.co/hJTg9vhs/kubricate-logo.png" alt="kubricate-logo" border="0" width="120" ></a>
<h4 align="center" style="padding:0;margin-top:0;">Kubricate</h4>
</p>

<p align="center">
A TypeScript framework for building, managing, and compiling Kubernetes resources with a structured, reusable, and Helm-compatible approach
</p>


<p align="center"><a href="https://github.com/thaitype/kubricate/actions/workflows/test-and-build.yml"><img src="https://github.com/thaitype/kubricate/actions/workflows/test-and-build.yml/badge.svg" alt="Build"></a>
<a href="https://www.npmjs.com/package/kubricate"><img alt="NPM Version (with dist tag)" src="https://img.shields.io/npm/v/kubricate">
 <a href="https://www.npmjs.com/package/kubricate"><img src="https://img.shields.io/npm/dt/kubricate" alt="npm download"></a></p>


> Experimental: This project is still in the early stages of development and is not yet ready for production use.

## Getting Started

```bash
npm install -D kubricate
npm install @kubricate/core
```

In case you want kubernetes type in typescript, just simple install `kubernetes-models` package. this will help you to generate typescript types from kubernetes resources.

```bash
npm install -D kubernetes-models
```

then, create a kubricate stack, what is kubricate stacks, help you to manage your kubernetes resources, and make it easy to deploy and manage your kubernetes resources.

this example show how to create namespace in kubricate

```ts
// File: src/my-stack.ts
import { createStack, ResourceComposer } from '@kubricate/core';
import { Namespace } from 'kubernetes-models/v1';

interface MyInput {
  name: string;
}

const MyStack = createStack('MyStack', (data: MyInput) => {
  return new ResourceComposer().addClass({
    id: 'namespace',
    type: Namespace,
    config: {
      metadata: { name: data.name },
    },
  });
});

export const myStack = MyStack.from({
  name: 'my-namespace',
});
```
then you can import into the `kubricate.config.ts` file, 
which you should place the file in the root of your project. 

```ts
import { defineConfig } from 'kubricate';
import { myStack } from './src/MyStack';

export default defineConfig({
  stacks: {
    myStack,
  },
});
```

then you can run the kubricate command to generate the kubernetes resources.

```sh
npx kubricate generate
```

this will generate the kubernetes resources in the `.kubricate` folder. the log will look like this:

```sh
✔ YAML file successfully written to:
  ~/with-custom-stack/.kubricate/stacks.yml
```

see the full example code: [with-custom-stack](https://github.com/thaitype/kubricate/tree/main/examples/with-custom-stack)

try it you will see how good it is to use kubricate, it provide type-safety and easy to use, and you can use it with your existing kubernetes resources, and also override the resource with type safety, and also has secretManager to manage your secret from your target source (we called loader) .e.g. EnvLoader that load from `.env` or env var and bring your secret to the kubernetes resources and injecting into manifest via secret ref without exposing the secret in the manifest. 

## Features
...

## Packages
- kubricate - main cli, and handle config, manipulate with kubricate stacks, and generate kubernetes resources
- @kubricate/core - core framework library for kubricate, and provide the core functionality for kubricate stacks
- @kubricate/env - EnvLoader that can load from `.env` or env var and bring your secret to the kubernetes resources and injecting into manifest via secret ref without exposing the secret in the manifest.
- @kubricate/stacks - Out of the box stacks that can be used with kubricate, and also provide the core functionality for kubricate stacks
- @kubricate/toolkit - a set of tools that can be used with kubricate

## How to Upgrade

make sure you using the same version of kubricate, here is the list of packages, that need to strict together for easy upgrade:
- kubricate
- @kubricate/core
- @kubricate/env
- @kubricate/stacks

## Usages

See in the [examples](https://github.com/thaitype/kubricate/tree/main/examples) folder.

## Documentation

See in the [examples](https://github.com/thaitype/kubricate/tree/main/examples) folder.

## Development

This manual for development of Kubricate package.

Before start, `pnpm install && pnpm dev` for install dependencies and start build typescript in watch mode.

## How to publish

1. pnpm changeset -> select the package you want to publish
2. git push 
3. waiting for github actions run and create a release PR
4. review on PR 
5. approve pr
6. it will auto publish to npm
