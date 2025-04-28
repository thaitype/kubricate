[Documentation](../../index.md) / [utils](../index.md) / mergeMetadata

# Function: mergeMetadata()

```ts
function mergeMetadata(key, input): undefined | Record<string, unknown>;
```

Merges metadata for Kubernetes resources.

This function is may deprecated in the future. It should have better way to merge metadata.
Pull Request is accepted.

## Parameters

### key

`"labels"` | `"annotations"`

### input

`Record`\<`string`, `string`\>

## Returns

`undefined` \| `Record`\<`string`, `unknown`\>
