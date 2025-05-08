# @kubricate/core

## 0.19.1

## 0.19.0

### Minor Changes

- 42a39f7: feat: unify secret config to secretSpec, rename plugins, drop deprecated fields

## 0.18.1

### Patch Changes

- 8d01c60: fix(cli): avoid injecting invalid Kubernetes label/annotation keys

## 0.18.0

### Minor Changes

- 681a196: feat(cli): support --stdout, --filter, outputMode config, improve metadata injection and secret handling

## 0.17.0

### Minor Changes

- 672f82f: Feature: Move SecretManager Ownership to Project Level (Global Registry Support)

## 0.16.0

### Minor Changes

- 420f4dd: Feature: Add targetPath Support to SecretInjectionStrategy for Flexible Injection Paths

## 0.15.0

## 0.14.0

### Minor Changes

- bcdc5b9: Refactor: Replace Loader with Connector for Bidirectional Secret Integration

## 0.13.0

## 0.12.0

### Minor Changes

- 4a11588: Secrets Merge: Multi-Level Strategy, Safer Defaults & Improved Traceability #60

## 0.11.2

## 0.11.1

### Patch Changes

- 84d0e72: Fix bug for issue #62, #63, #66

## 0.11.0

### Minor Changes

- 0de0144: Refactor inject() API to Support 2-Args Design for Secret Injection

## 0.10.0

### Minor Changes

- c3b3cd9: Redesign Secrets API: Builder Pattern, Multi-Secret Type Support & New Providers

## 0.9.1

### Patch Changes

- c358c6c: Fix Type inference when build with createStack factory helper function

## 0.9.0

### Minor Changes

- dcedcc8: Add createStack Helper for Simplifying Custom Stack Definitions

## 0.8.0

### Minor Changes

- 0c6adef: refactor: rename ManifestComposer to ResourceComposer and update related documentation

## 0.7.0

### Minor Changes

- e474bb7: feat(core/secrets): introduce SecretManager integration and CLI orchestration

## 0.6.1

### Patch Changes

- fbe95a5: Use ESM module for all projects

## 0.6.0

### Minor Changes

- 7770677: Refactor Kubricate core and add new command "generate" for cli

## 0.5.1

## 0.5.0

### Minor Changes

- 4e55ce4: Migrate to @kubricate/core Package and Improve Mono Scripts (@kubricate/mono)

## 0.4.0

## 0.3.1

### Patch Changes

- 844449b: Refactor Toolchain: Centralize Dual Output Build for both ESM and CJS with Mono Package

## 0.3.0

### Minor Changes

- 031f069: Add Official stack definitions for [kubricate](https://github.com/thaitype/kubricate), designed to simplify building Kubernetes resources in a structured and reusable way.

## 0.2.2

### Patch Changes

- feb9668: Fix Build TypeScript Output for ESM

## 0.2.1

### Patch Changes

- 6af0194: Migrate kubricate main package to monorepo & Support dual npm publish
