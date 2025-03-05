# kubricate

A TypeScript framework for building, managing, and compiling Kubernetes manifests with a structured, reusable, and Helm-compatible approach

> Experimental: This project is still in the early stages of development and is not yet ready for production use.

Leverage [kosko](https://kosko.dev/) generate feature to generate k8s manifests from a structured TypeScript codebase.

## Example

Run exmaple
```bash
bun kosko generate nginx  --cwd examples/SimpleAppStack 
```