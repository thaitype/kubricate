[Documentation](../../index.md) / [EnvConnector](../index.md) / EnvConnectorConfig

# Interface: EnvConnectorConfig

## Properties

### allowDotEnv?

```ts
optional allowDotEnv: boolean;
```

populate process.env with the contents of a .env file

#### Default

`true`

***

### caseInsensitive?

```ts
optional caseInsensitive: boolean;
```

Whether to perform case-insensitive lookups for environment variables.
If true, the connector will match environment variable names in a case-insensitive manner.

#### Default

`false`

***

### prefix?

```ts
optional prefix: string;
```

The prefix to use for environment variables.

#### Default

`KUBRICATE_SECRET_`

***

### workingDir?

```ts
optional workingDir: string;
```

The working directory to load the .env file from.
This is useful for loading .env files from different directories.

#### Default

`process.cwd()`
