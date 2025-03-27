# Kubricate

[![Release](https://github.com/thaitype/kubricate/actions/workflows/release.yml/badge.svg?branch=main.migrate-to-monorepo)](https://github.com/thaitype/kubricate/actions/workflows/release.yml)

A TypeScript framework for building, managing, and compiling Kubernetes manifests with a structured, reusable, and Helm-compatible approach

> Experimental: This project is still in the early stages of development and is not yet ready for production use.

Leverage [kosko](https://kosko.dev/) generate feature to generate k8s manifests from a structured TypeScript codebase.

## Example

Run example
```bash
bun kosko generate nginx  --cwd examples/SimpleAppStack 
```

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
