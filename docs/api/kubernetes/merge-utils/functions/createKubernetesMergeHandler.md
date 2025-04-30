[Documentation](../../index.md) / [merge-utils](../index.md) / createKubernetesMergeHandler

# Function: createKubernetesMergeHandler()

```ts
function createKubernetesMergeHandler(): (effects) => PreparedEffect[];
```

Creates a reusable handler to merge multiple Kubernetes Secret effects.
Will group by Secret `metadata.name` + `namespace` and merge `.data`.
Throws error if duplicate keys are found within the same Secret.

## Returns

```ts
(effects): PreparedEffect[];
```

### Parameters

#### effects

`PreparedEffect`[]

### Returns

`PreparedEffect`[]
