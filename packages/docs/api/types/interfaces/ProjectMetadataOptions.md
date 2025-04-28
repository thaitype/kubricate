[Documentation](../../index.md) / [types](../index.md) / ProjectMetadataOptions

# Interface: ProjectMetadataOptions

Metadata configuration for project-wide resource generation behavior.

## Properties

### inject?

```ts
optional inject: boolean;
```

Whether to automatically inject standard Kubricate metadata
(such as labels and annotations) into every generated resource.
If `true`, Kubricate will inject fields like `stack-id`, `stack-name`, `version`, and `managed-at`.
Defaults to `true` if omitted.

#### Default

```ts
true
```

***

### injectManagedAt?

```ts
optional injectManagedAt: boolean;
```

Whether to inject the 'managed-at' annotation into each generated resource.
If false, Kubricate will omit the 'thaitype.dev/kubricate/managed-at' field.

Defaults to `true`.

#### Default

```ts
true
```

***

### injectResourceHash?

```ts
optional injectResourceHash: boolean;
```

Whether to inject the 'resource-hash' annotation into each generated resource.

When enabled, Kubricate will calculate a stable hash of the resource content
(excluding dynamic fields like 'managed-at') and inject it into
the annotation 'thaitype.dev/kubricate/resource-hash'.

Useful for GitOps and drift detection tools to track changes in resource specifications.

Defaults to `true` if omitted.

#### Default

```ts
true
```

***

### injectVersion?

```ts
optional injectVersion: boolean;
```

Whether to inject the 'version' annotation into each generated resource.

When enabled, Kubricate will inject the CLI framework version
(e.g., `0.17.0`) into the annotation 'thaitype.dev/kubricate/version'.

Useful for tracking which Kubricate version was used to generate the manifest,
which can assist in debugging, auditing, or reproducing environments.

Defaults to `true` if omitted.

#### Default

```ts
true
```
