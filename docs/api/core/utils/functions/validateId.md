[Documentation](../../index.md) / [utils](../index.md) / validateId

# Function: validateId()

```ts
function validateId(input, subject): void;
```

Validate Stack Id or Resource Id

## Parameters

### input

`string`

*

### subject

`string` = `'id'`

## Returns

`void`

- The sanitized string.

## Ref

https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set
The limit characters for labels is 63.
