# Design Spec: `coreVersion` and Package Metadata via `metadata.gen.ts`

## 1. Goals

* Automatically associate each stack template with the **`@kubricate/core` version** used to define it.
* Allow **core, stacks, and other packages** to expose their version as a **runtime-agnostic constant**.
* Avoid any runtime file system access (`fs`, `path`, `process.cwd()`) in:

  * `@kubricate/core`
  * `@kubricate/stacks`
  * other shared packages
* Use the `kubricate` CLI to generate a **`metadata.gen.ts`** file from `package.json` for any package in the ecosystem.

> For now, `metadata` only has a single field: `version`.

---

## 2. `coreVersion` in `@kubricate/core`

### 2.1 Source of truth

* `@kubricate/core` exposes its own version via a generated file:

```ts
// packages/core/src/metadata.gen.ts (auto-generated)
export const metadata = {
  version: "0.22.1",
};
```

* A `kubricate` CLI command generates or updates this file based on `@kubricate/core`’s `package.json` before publishing.
* Core itself does **not** read `package.json` at runtime and does **not** use `fs` or other Node APIs.

---

### 2.2 Injection into `StackTemplate`

* `StackTemplateMetadata` includes `coreVersion`:

```ts
export interface StackTemplateMetadata extends StackTemplateMetadataInput {
  coreVersion: string; // injected by core, not user-supplied
}
```

* `defineStackTemplate` in core injects `coreVersion` using `metadata.gen.ts`:

```ts
import { metadata as coreMetadata } from './metadata.gen.js';

const metadata: StackTemplateMetadata | undefined =
  config.metadata
    ? { ...config.metadata, coreVersion: coreMetadata.version }
    : undefined;

return {
  name: config.name,
  build: config.build,
  metadata,
};
```

* Template authors **cannot set or override** `coreVersion`.

---

### 2.3 Non-goals (core)

`@kubricate/core` does **not**:

* Read `package.json` at runtime.
* Provide helpers for reading package or template versions.
* Perform runtime validation of stack template names (that remains in `kubricate` or higher layers).
* Depend on Node-specific APIs at runtime.

Core remains **pure**, **stable**, and **environment-agnostic**.

---

## 3. `metadata.gen.ts` in Stacks and Other Packages

### 3.1 Source of truth for template version

Each stacks package (for example `@kubricate/stacks`) also has its own `metadata.gen.ts`:

```ts
// packages/stacks/src/metadata.gen.ts (auto-generated)
export const metadata = {
  version: "1.4.2",
};
```

Template authors can consume it directly:

```ts
import { metadata } from './metadata.gen.js';

defineStackTemplate({
  name: '@kubricate/stacks/simple-app',
  metadata: {
    version: metadata.version, // template/package version
    author: 'Platform Team',
  },
  build(input) {
    return {
      // Kubernetes resources
    };
  },
});
```

This is:

* **Runtime-agnostic** (just a static object)
* Safe in:

  * Node
  * browser
  * edge runtimes
  * bundlers

There is **no** need to read `package.json` at runtime in the stacks package.

---

### 3.2 Other packages (plugins, toolkit, etc.)

Any package in the ecosystem that needs to expose its own version can adopt the same pattern:

```ts
// packages/plugin-kubernetes/src/metadata.gen.ts
export const metadata = {
  version: "0.5.0",
};
```

How this metadata is used is up to the package:

* Just for diagnostics
* For compatibility checks
* For reporting in CLIs or UIs

---

## 4. `kubricate` CLI: Metadata Generator Command

### 4.1 Purpose

The `kubricate` CLI provides a helper command that:

* Reads `package.json` of the current package (or a specified path)
* Extracts the `version` field
* Writes or updates `metadata.gen.ts` with:

  ```ts
  export const metadata = {
    version: "x.y.z",
  };
  ```

This command can be used for:

* `@kubricate/core`
* `@kubricate/stacks`
* `plugin-*` packages
* user-created stack packages

---

### 4.2 Example CLI usage

Example command:

```bash
kubricate generate-metadata
```

Possible options:

* `--cwd <path>` – package root (default: current working directory)
* `--outfile <path>` – output file (default: `src/metadata.gen.ts`)
* `--field <name>` – JSON field in `package.json` (default: `"version"`)

The command:

1. Reads `<cwd>/package.json`
2. Gets `pkg[field]` (default `pkg.version`)
3. Writes `metadata.gen.ts` with:

   ```ts
   export const metadata = {
     version: "1.4.2",
   };
   ```

---

## 5. Rationale (short)

* **Core**:

  * Uses `metadata.gen.ts` to know **its own version**.
  * Injects `coreVersion` into template metadata to track which core version defined a template.
  * Remains free from runtime file I/O and Node dependencies.

* **Stacks and other packages**:

  * Expose their version via `metadata.gen.ts`.
  * Can use this version when defining templates, or for diagnostics.
  * Remain fully usable in any JavaScript runtime (Node, browser, edge).

* **`kubricate` CLI**:

  * Owns the responsibility of bridging `package.json` → `metadata.gen.ts`.
  * Centralizes version generation logic.
  * Makes it easy for any package to adopt the pattern with one command.

This design keeps the runtime surface clean and portable while giving the entire Kubricate ecosystem a consistent, static, and safe way to access version information.
