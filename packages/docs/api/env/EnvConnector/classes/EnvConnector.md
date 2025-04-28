[Documentation](../../index.md) / [EnvConnector](../index.md) / EnvConnector

# Class: EnvConnector

EnvConnector is a BaseConnector implementation that reads secrets
from process.env, optionally loading from a .env file and supporting
configurable prefixes and case-insensitive lookups.

## Implements

- `BaseConnector`\<[`EnvConnectorConfig`](../interfaces/EnvConnectorConfig.md)\>

## Constructors

### Constructor

```ts
new EnvConnector(config?): EnvConnector;
```

#### Parameters

##### config?

[`EnvConnectorConfig`](../interfaces/EnvConnectorConfig.md)

#### Returns

`EnvConnector`

## Properties

### config

```ts
config: EnvConnectorConfig;
```

Optional configuration used during initialization.

#### Implementation of

```ts
BaseConnector.config
```

***

### logger?

```ts
optional logger: BaseLogger;
```

#### Implementation of

```ts
BaseConnector.logger
```

## Methods

### get()

```ts
get(name): SecretValue;
```

Get the value of a secret.

#### Parameters

##### name

`string`

The name of the secret to get.

#### Returns

`SecretValue`

The value of the secret.

#### Throws

Will throw an error if the secret is not loaded.

#### Implementation of

```ts
BaseConnector.get
```

***

### getEnvFilePath()

```ts
getEnvFilePath(): string;
```

#### Returns

`string`

***

### getWorkingDir()

```ts
getWorkingDir(): undefined | string;
```

Get the working directory for loading .env files.

#### Returns

`undefined` \| `string`

The path to the working directory.

#### Implementation of

```ts
BaseConnector.getWorkingDir
```

***

### load()

```ts
load(names): Promise<void>;
```

Load secrets from environment variables.

#### Parameters

##### names

`string`[]

The names of the secrets to load.

#### Returns

`Promise`\<`void`\>

#### Throws

Will throw an error if a secret is not found or if the name is invalid.

#### Implementation of

```ts
BaseConnector.load
```

***

### normalizeName()

```ts
normalizeName(name): string;
```

#### Parameters

##### name

`string`

#### Returns

`string`

***

### setWorkingDir()

```ts
setWorkingDir(path): void;
```

Set the working directory for loading .env files.

#### Parameters

##### path

`string`

The path to the working directory.

#### Returns

`void`

#### Implementation of

```ts
BaseConnector.setWorkingDir
```

***

### tryParseSecretValue()

```ts
tryParseSecretValue(value): SecretValue;
```

#### Parameters

##### value

`string`

#### Returns

`SecretValue`
