[Documentation](../../../../index.md) / [secret/providers/merge-utils](../index.md) / createMergeHandler

# Function: createMergeHandler()

```ts
function createMergeHandler(): (effects) => PreparedEffect[];
```

Creates a reusable handler to merge multiple Raw Secret effects.
Will group by Secret `storeName` and merge `.data`.
Throws error if duplicate keys are found within the same store.

## Returns

```ts
(effects): PreparedEffect[];
```

### Parameters

#### effects

[`PreparedEffect`](../../BaseProvider/type-aliases/PreparedEffect.md)[]

### Returns

[`PreparedEffect`](../../BaseProvider/type-aliases/PreparedEffect.md)[]
