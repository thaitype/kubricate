## 1. Change Summary

You are introducing a new, preferred overload:

```ts
defineStackTemplate({
  name: '@acme/app-stacks/simple-app',
  metadata: {
    version: '1.0.0',
    author: 'Platform Team',
    homepage: 'https://docs.acme.com/simple-app',
    repository: 'https://github.com/acme/app-stacks',
  },
  build(input) {
    return {
      deployment: new Deployment({ /* ... */ }),
      service: new Service({ /* ... */ }),
    };
  },
});
```

while keeping the old form for compatibility:

```ts
defineStackTemplate('simple-app', (input) => ({
  deployment: new Deployment({ /* ... */ }),
}));
```

Behind the scenes:

* `name` is the stack-template identifier (`stack-template-name`) with three allowed shapes:
  `<templateName>` / `@<org>/<templateName>` / `@<org>/<package>/<templateName>`
* `metadata` is package.json-inspired (version, author, homepage, repository, etc.).
* `coreVersion` is injected internally (not user-settable).
* Validation for `name` lives in `kubricate` (CLI/engine), not in `@kubricate/core`.

---

## 2. API Shape – What works well

### Single config object is a good evolution

* `defineStackTemplate({ name, metadata, build })` makes the template feel like a declarative definition, not a loose tuple.
* It is easy to extend without touching the function signature again (add `tags`, `deprecated`, `category`, `inputsSchema`, etcetera later).
* The `build` naming is semantically correct: “this template builds resources from input.”

### Backwards compat overload is the right move

* Keeping `(name: string, build: (input) => Resources)` means zero breakage.
* You can document the object form as “preferred” while giving people time to migrate organically.

### Metadata model is coherent

* The package.json inspiration (`version`, `author`, `homepage`, `repository`) will feel natural to TypeScript developers.
* Injecting `coreVersion` internally ensures you always know which `@kubricate/core` version a template targets, without trusting user input.

---

## 3. Strengths of the new design

1. **Clear separation of concerns**

   * `@kubricate/core` stays minimal (types + structure).
   * `kubricate` takes responsibility for validation and policy (naming rules, patterns).

2. **Predictable template identity**

   * The `stack-template-name` format gives you a single, consistent identifier that can scale from local use to multi-org, multi-package ecosystems.

3. **Good ergonomics for template authors**

   * Single object argument reads nicely and groups everything related to the template in one place.

4. **Future-proof**

   * You can safely add fields to the config object without creating more overloads.
   * The namespace-like name format (`simple-app`, `@org/template`, `@org/pkg/template`) gives you room to grow without redesign.

---

## 4. Risks / Concerns

1. **Slight complexity at the implementation level**

   * The overload implementation needs to handle:

     * `defineStackTemplate(name, build)` and
     * `defineStackTemplate(config)`
   * If not tested well, type inference or error messages might get a bit noisy, especially around `TInput` / `TResources`.

2. **Mental shift for existing users**

   * People who learned the old signature might not discover the config form unless you:

     * Promote it in docs and examples.
     * Show it in new templates first.

3. **Name pattern is strict but custom**

   * The three-form identifier looks npm-like but is not exactly npm semantics.
   * You will need to be explicit in docs that this is a *stack template identifier*, not literally a package name.

4. **Validation location must be consistent**

   * Since validation lives in `kubricate`, not `@kubricate/core`, any other tools that directly use core will not get automatic validation.
   * That is fine by design, but it should be clearly documented so expectations are aligned.

---

## 5. Migration and Usage

### What stays valid

* All existing calls:

  ```ts
  defineStackTemplate('my-stack', buildFn);
  ```

  remain valid and behave the same, aside from now potentially failing if they violate the new name validation when used via `kubricate`.

### Recommended new style

* New templates should prefer:

  ```ts
  defineStackTemplate({
    name: '@org/app-stacks/simple-app',
    metadata: {
      version: '1.0.0',
      author: 'Platform Team',
      repository: 'https://github.com/org/app-stacks',
    },
    build(input) {
      return { /* resources */ };
    },
  });
  ```

* In docs, show the object form first, and mention the legacy two-arg form as a “short form” that is still supported.

---

## 6. Minor suggestions / nitpicks

1. **Make `version` required in metadata**

   * If you treat templates as versioned artefacts, consider requiring `version` when `metadata` is provided.
   * You can still allow templates without metadata entirely, but once metadata exists, a missing version is suspicious.

2. **Be explicit in docs about the three name patterns**

   * Include a short snippet in the API reference, something like:

     > `name` must match one of: `<template>`, `@org/<template>`, `@org/<package>/<template>` using only `a-z`, `0-9`, `.`, `_`, `-`.

3. **Decide how strict validation is at first**

   * Consider starting with *hard errors* for obviously invalid cases (spaces, illegal characters).
   * If you are worried about existing names, you can start with warnings in a minor release, then make them errors later.

---

## 7. Overall verdict

The new `defineStackTemplate` overload with a single config object and a `build` function is a **solid, forward-looking improvement**:

* It keeps the core API stable and compatible.
* It introduces a much cleaner way to describe templates, metadata, and behaviour in one place.
* It gives Kubricate a robust naming scheme without overcomplicating the public surface.

The main work left is:

* Implement the overload cleanly.
* Centralize validation in `kubricate`.
* Update docs and examples to feature the new object form as the primary way to define stack templates.
