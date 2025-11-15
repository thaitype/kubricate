## Proposed metadata shape

Split this into **user-input metadata** and **internal metadata** so TypeScript can enforce “user cannot set `coreVersion`”.

```ts
// What users are allowed to provide
export interface StackTemplateMetadataInput {
  version: string;                // template version (required)
  author?: string;                // "Platform Team" or "John Doe <john@acme.com>"
  description?: string;
  homepage?: string;              // like package.json:homepage
  repository?: string;            // or use repositoryUrl if you prefer that name
}

// What Kubricate will actually store internally
export interface StackTemplateMetadata extends StackTemplateMetadataInput {
  coreVersion: string;            // injected from @kubricate/core, not user-settable
}
```

---

## `defineStackTemplate` descriptor and overloads

First argument: string or descriptor, just like you suggested.

```ts
export interface StackTemplateDescriptor {
  name: string;
  metadata?: StackTemplateMetadataInput;  // user-facing shape (no coreVersion)
}
```

Overloads:

```ts
// 1) Existing API
export function defineStackTemplate<
  TInput,
  TResourceMap extends Record<string, unknown>
>(
  name: string,
  create: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap>;

// 2) New API: descriptor
export function defineStackTemplate<
  TInput,
  TResourceMap extends Record<string, unknown>
>(
  descriptor: StackTemplateDescriptor,
  create: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap>;

// Implementation
export function defineStackTemplate<
  TInput,
  TResourceMap extends Record<string, unknown>
>(
  nameOrDescriptor: string | StackTemplateDescriptor,
  create: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap> {
  const descriptor: StackTemplateDescriptor =
    typeof nameOrDescriptor === 'string'
      ? { name: nameOrDescriptor }
      : nameOrDescriptor;

  const coreVersion = getKubricateCoreVersionSomehow(); // import or injected constant

  const metadata: StackTemplateMetadata | undefined = descriptor.metadata
    ? { ...descriptor.metadata, coreVersion }
    : undefined;

  return {
    name: descriptor.name,
    create,
    metadata,
  };
}
```

Old code keeps working:

```ts
defineStackTemplate('SimpleApp', createFn);
```

New richer form:

```ts
defineStackTemplate(
  {
    name: 'Simple App Stack',
    metadata: {
      version: '1.0.0',
      author: 'Platform Team',
      homepage: 'https://docs.acme.com/simple-app',
      repository: 'https://github.com/acme/simple-app-stack',
    },
  },
  createFn
);
```

Kubricate automatically adds `coreVersion` internally.

---

## YAML annotations mapping

Example output:

```yaml
metadata:
  annotations:
    kubricate.thaitype.dev/stack-template-name: Simple App Stack
    kubricate.thaitype.dev/stack-template-version: 1.0.0
    kubricate.thaitype.dev/stack-template-author: Platform Team
    kubricate.thaitype.dev/stack-template-homepage: https://docs.acme.com/simple-app
    kubricate.thaitype.dev/stack-template-repository: https://github.com/acme/simple-app-stack
    kubricate.thaitype.dev/stack-template-core-version: 0.22.1
```

No `org`, `coreVersion` is always present when metadata exists, and user can never override it.

---

## Concise critique of this change

* Good:

  * The `package.json` intuition stays strong: `version`, `author`, `homepage`, `repository`.
  * Hiding `coreVersion` behind the helper is a very clean separation of concerns.
  * Removing `org` simplifies the story and avoids a field that people will often leave empty.
  * Descriptor-or-string first argument is still minimal change and fully backward compatible.

* Watch out for:

  * Decide clearly between `homepage` vs `docsUrl`; otherwise people might not know which to use. You can keep both but document recommended usage.
  * Make sure `coreVersion` injection is deterministic (for example, imported from `@kubricate/core` version constant or generated at build time) so snapshots are stable.

If you want, I can next turn this into a ready-to-paste **PR description** or **design note** for `kubricate` repo.
