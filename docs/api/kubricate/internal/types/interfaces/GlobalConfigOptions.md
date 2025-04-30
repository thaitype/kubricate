[Documentation](../../../index.md) / [internal/types](../index.md) / GlobalConfigOptions

# Interface: GlobalConfigOptions

## Extended by

- [`SecretCommandOptions`](../../../commands/SecretCommand/interfaces/SecretCommandOptions.md)
- [`GenerateCommandOptions`](../../../commands/generate/GenerateCommand/interfaces/GenerateCommandOptions.md)

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

***

### silent?

```ts
optional silent: boolean;
```

***

### verbose?

```ts
optional verbose: boolean;
```

***

### version?

```ts
optional version: string;
```

Version of the CLI.
