[Documentation](../../../index.md) / [commands/ConfigLoader](../index.md) / ConfigLoader

# Class: ConfigLoader

## Constructors

### Constructor

```ts
new ConfigLoader(options, logger): ConfigLoader;
```

#### Parameters

##### options

[`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md)

##### logger

`BaseLogger`

#### Returns

`ConfigLoader`

## Properties

### logger

```ts
protected logger: BaseLogger;
```

***

### options

```ts
protected options: GlobalConfigOptions;
```

## Methods

### handleDeprecatedSecretOptions()

```ts
protected handleDeprecatedSecretOptions(config): undefined | KubricateConfig;
```

#### Parameters

##### config

`undefined` | `KubricateConfig`

#### Returns

`undefined` \| `KubricateConfig`

***

### initialize()

```ts
initialize<CommandOptions>(options): Promise<{
  config: KubricateConfig;
  orchestrator: SecretsOrchestrator;
}>;
```

Initialize everything needed to run the command

#### Type Parameters

##### CommandOptions

`CommandOptions` *extends* `Record`\<`string`, `unknown`\>

#### Parameters

##### options

`InitializeOptions`\<`CommandOptions`\>

#### Returns

`Promise`\<\{
  `config`: `KubricateConfig`;
  `orchestrator`: `SecretsOrchestrator`;
\}\>

***

### injectLogger()

```ts
protected injectLogger(config): void;
```

#### Parameters

##### config

`KubricateConfig`

#### Returns

`void`

***

### load()

```ts
load(): Promise<KubricateConfig>;
```

#### Returns

`Promise`\<`KubricateConfig`\>

***

### prepare()

```ts
prepare(config): Promise<SecretsOrchestrator>;
```

#### Parameters

##### config

`KubricateConfig`

#### Returns

`Promise`\<`SecretsOrchestrator`\>

***

### setLogger()

```ts
setLogger(logger): void;
```

#### Parameters

##### logger

`BaseLogger`

#### Returns

`void`

***

### showVersion()

```ts
showVersion(): void;
```

#### Returns

`void`
