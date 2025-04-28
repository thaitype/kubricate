[Documentation](../../../../index.md) / [commands/generate/GenerateCommand](../index.md) / GenerateCommand

# Class: GenerateCommand

## Constructors

### Constructor

```ts
new GenerateCommand(options, logger): GenerateCommand;
```

#### Parameters

##### options

[`GenerateCommandOptions`](../interfaces/GenerateCommandOptions.md)

##### logger

`BaseLogger`

#### Returns

`GenerateCommand`

## Properties

### logger

```ts
protected logger: BaseLogger;
```

***

### options

```ts
protected options: GenerateCommandOptions;
```

## Methods

### execute()

```ts
execute(config): Promise<void>;
```

#### Parameters

##### config

`KubricateConfig`

#### Returns

`Promise`\<`void`\>

***

### filterResources()

```ts
filterResources(renderedFiles, filters): RenderedFile[];
```

#### Parameters

##### renderedFiles

[`RenderedFile`](../../GenerateRunner/interfaces/RenderedFile.md)[]

##### filters

`string`[]

#### Returns

[`RenderedFile`](../../GenerateRunner/interfaces/RenderedFile.md)[]

***

### getRenderedFiles()

```ts
getRenderedFiles(config, outputMode): RenderedFile[];
```

#### Parameters

##### config

`KubricateConfig`

##### outputMode

`undefined` | `"flat"` | `"stack"` | `"resource"`

#### Returns

[`RenderedFile`](../../GenerateRunner/interfaces/RenderedFile.md)[]

***

### resolveDefaultGenerateOptions()

```ts
resolveDefaultGenerateOptions(config): Required<ProjectGenerateOptions> & ProjectGenerateOptions;
```

#### Parameters

##### config

`KubricateConfig`

#### Returns

`Required`\<`ProjectGenerateOptions`\> & `ProjectGenerateOptions`

***

### showStacks()

```ts
showStacks(config): void;
```

#### Parameters

##### config

`KubricateConfig`

#### Returns

`void`
