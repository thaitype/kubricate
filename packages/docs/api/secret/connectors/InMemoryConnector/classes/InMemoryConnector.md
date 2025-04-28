[Documentation](../../../../index.md) / [secret/connectors/InMemoryConnector](../index.md) / InMemoryConnector

# Class: InMemoryConnector

InMemoryConnector is a simple in-memory connector for secrets.
For testing purposes only.

## Implements

- [`BaseConnector`](../../BaseConnector/interfaces/BaseConnector.md)

## Constructors

### Constructor

```ts
new InMemoryConnector(config): InMemoryConnector;
```

#### Parameters

##### config

`Record`\<`string`, `string`\>

#### Returns

`InMemoryConnector`

## Properties

### config

```ts
config: Record<string, string>;
```

Optional configuration used during initialization.

#### Implementation of

[`BaseConnector`](../../BaseConnector/interfaces/BaseConnector.md).[`config`](../../BaseConnector/interfaces/BaseConnector.md#config-1)

## Methods

### get()

```ts
get(name): string;
```

Return a secret by name after it has been loaded.
Throws if the secret was not previously loaded via `load()`.

#### Parameters

##### name

`string`

#### Returns

`string`

#### Implementation of

[`BaseConnector`](../../BaseConnector/interfaces/BaseConnector.md).[`get`](../../BaseConnector/interfaces/BaseConnector.md#get)

***

### load()

```ts
load(names): Promise<void>;
```

Pre-load and validate a list of secret names.
Should fail fast if required secrets are missing or invalid.

These names must correspond to top-level keys.

This method is required before calling `get()`.

#### Parameters

##### names

`string`[]

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`BaseConnector`](../../BaseConnector/interfaces/BaseConnector.md).[`load`](../../BaseConnector/interfaces/BaseConnector.md#load)
