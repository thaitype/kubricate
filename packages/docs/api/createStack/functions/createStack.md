[Documentation](../../index.md) / [createStack](../index.md) / createStack

# Function: createStack()

```ts
function createStack<Data, Entries>(name, builder): object;
```

Factory function to create stack

## Type Parameters

### Data

`Data`

### Entries

`Entries` *extends* `Record`\<`string`, `unknown`\> = \{
\}

## Parameters

### name

`string`

### builder

[`ConfigureComposerFunction`](../type-aliases/ConfigureComposerFunction.md)\<`Data`, `Entries`\>

## Returns

`object`

### from()

```ts
from(data): GenericStack<Data, Entries>;
```

#### Parameters

##### data

`Data`

#### Returns

[`GenericStack`](../classes/GenericStack.md)\<`Data`, `Entries`\>
