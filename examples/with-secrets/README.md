# Example With Kubernetes Official Stacks

## Installation

```bash
pnpm install @kubricate/stacks 
pnpm install -D @kubernetes-models/base@^5.0.1 kosko @kosko/env ts-node
```
## Usages

Run the following command to generate manifests from all components:

```bash
npx kosko generate "*"
```