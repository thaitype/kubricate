## Revised Plan: Stack Template Naming & Validation

### 1. Goals

* Keep `@kubricate/core` **stable and minimal**: types, basic contracts, and no fast-changing policy.
* Implement **naming rules and validation** in the `kubricate` package (CLI + engine).
* Introduce a clear, predictable format for the stack template identifier that still feels familiar to JavaScript and TypeScript developers.

---

### 2. Stack Template Name: Single Field, Three Allowed Forms

We standardize on a single logical field:

* **`stack-template-name`** (stored as `StackTemplate.name` in core, and emitted as `kubricate.thaitype.dev/stack-template-name` in annotations).

The value **must** match exactly one of these patterns:

1. `<templateName>`
2. `@<orgName>/<templateName>`
3. `@<orgName>/<packageName>/<templateName>`

All segments use a simple, npm-like character set:

* Allowed characters: `a-z`, `0-9`, `.`, `_`, `-`
* No spaces

Examples:

* `simple-app`
* `@acme/simple-app`
* `@acme/app-stacks/simple-app`

This name is treated as a **template identifier**, not a free-form display label.

---

### 3. Where Validation Lives

* `@kubricate/core`:

  * Keeps `StackTemplate.name: string` as-is.
  * Does **not** enforce any naming rules.
  * Continues to focus on types and minimal runtime behavior.

* `kubricate` (CLI + engine):

  * Provides a `validateStackTemplateName(value: string)` helper.
  * Calls this validator whenever it uses a `StackTemplate` to generate manifests or inject metadata.
  * Throws a clear error if `stack-template-name` does not match one of the three allowed patterns.

This keeps naming policy in the application layer (kubricate) and preserves core stability.

---

### 4. `defineStackTemplate` Usage and Metadata

The first argument of `defineStackTemplate` stays flexible:

* String form (existing):

  ```ts
  defineStackTemplate("simple-app", createFn);
  defineStackTemplate("@acme/app-stacks/simple-app", createFn);
  ```

* Descriptor form (enhanced):

  ```ts
  defineStackTemplate(
    {
      name: "@acme/app-stacks/simple-app",
      metadata: {
        version: "1.0.0",
        author: "Platform Team",
        homepage: "https://docs.acme.com/simple-app",
        repository: "https://github.com/acme/app-stacks",
      },
    },
    createFn
  );
  ```

`@kubricate/core` internally augments `metadata` with `coreVersion`, which users cannot override.

`kubricate` validates `name` using `validateStackTemplateName` before emitting YAML.

---

### 5. YAML Annotations

Example output:

```yaml
metadata:
  annotations:
    kubricate.thaitype.dev/stack-template-name: "@acme/app-stacks/simple-app"
    kubricate.thaitype.dev/stack-template-version: "1.0.0"
    kubricate.thaitype.dev/stack-template-author: "Platform Team"
    kubricate.thaitype.dev/stack-template-homepage: "https://docs.acme.com/simple-app"
    kubricate.thaitype.dev/stack-template-repository: "https://github.com/acme/app-stacks"
    kubricate.thaitype.dev/stack-template-core-version: "0.22.1"
```
