[Documentation](../../../index.md) / [commands/SecretCommand](../index.md) / SecretCommandOptions

# Interface: SecretCommandOptions

## Extends

- [`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md)

## Properties

### config?

```ts
optional config: string;
```

Config file name to load.
If not specified, the default config file name will be used.

#### Default

```ts
'kubricate.config'
```

#### Inherited from

[`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md).[`config`](../../../internal/types/interfaces/GlobalConfigOptions.md#config)

***

### dryRun?

```ts
optional dryRun: boolean;
```

Dry run mode.
If set to true, the CLI will not execute any commands,
but will print what would be done.

#### Default

```ts
false
```

#### Inherited from

[`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md).[`dryRun`](../../../internal/types/interfaces/GlobalConfigOptions.md#dryrun)

***

### logger?

```ts
optional logger: ConsoleLogger;
```

Enable verbose output.
This will enable debug logging and show more information in the output.
If not specified, the default log level will be used.

#### Default

```ts
ConsoleLogger.LogLevel.INFO
```

#### Inherited from

[`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md).[`logger`](../../../internal/types/interfaces/GlobalConfigOptions.md#logger)

***

### root?

```ts
optional root: string;
```

Working directory to load the config from.
This is the directory where the config file is located.
If not specified, the current working directory will be used.

#### Default

```ts
process.cwd()
```

#### Inherited from

[`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md).[`root`](../../../internal/types/interfaces/GlobalConfigOptions.md#root)

***

### silent?

```ts
optional silent: boolean;
```

#### Inherited from

[`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md).[`silent`](../../../internal/types/interfaces/GlobalConfigOptions.md#silent)

***

### verbose?

```ts
optional verbose: boolean;
```

#### Inherited from

[`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md).[`verbose`](../../../internal/types/interfaces/GlobalConfigOptions.md#verbose)

***

### version?

```ts
optional version: string;
```

Version of the CLI.

#### Inherited from

[`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md).[`version`](../../../internal/types/interfaces/GlobalConfigOptions.md#version)
