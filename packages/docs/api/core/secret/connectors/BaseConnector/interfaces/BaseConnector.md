[Documentation](../../../../index.md) / [secret/connectors/BaseConnector](../index.md) / BaseConnector

# Interface: BaseConnector\<Config\>

BaseConnector is the interface for secret connectors,
responsible for resolving secrets from sources such as
environment variables, cloud secret managers, etc.

Connectors are read-only and should not persist data to any provider.

## Type Parameters

### Config

`Config` *extends* `object` = `object`

## Properties

### config

```ts
config: Config;
```

Optional configuration used during initialization.

***

### logger?

```ts
optional logger: BaseLogger;
```

## Methods

### get()

```ts
get(name): SecretValue;
```

Return a secret by name after it has been loaded.
Throws if the secret was not previously loaded via `load()`.

#### Parameters

##### name

`string`

#### Returns

[`SecretValue`](../../../types/type-aliases/SecretValue.md)

***

### getWorkingDir()?

```ts
optional getWorkingDir(): undefined | string;
```

Get the working directory for the connector.
This is useful for connectors that need to read files from a specific directory.

For example, the EnvConnector may need to read a .env file from a specific path.
This method is optional and may not be implemented by all connectors.
If not implemented, it will return undefined.

#### Returns

`undefined` \| `string`

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

***

### setWorkingDir()?

```ts
optional setWorkingDir(path): void;
```

Set the working directory for the connector.
This is useful for connectors that need to read files from a specific directory.

For example, the EnvConnector may need to read a .env file from a specific path.
This method is optional and may not be implemented by all connectors.
If not implemented, it will be a no-op.

#### Parameters

##### path

The path to the working directory.

`undefined` | `string`

#### Returns

`void`
