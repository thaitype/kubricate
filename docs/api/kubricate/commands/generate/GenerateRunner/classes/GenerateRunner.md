[Documentation](../../../../index.md) / [commands/generate/GenerateRunner](../index.md) / GenerateRunner

# Class: GenerateRunner

## Constructors

### Constructor

```ts
new GenerateRunner(
   options, 
   generateOptions, 
   renderedFiles, 
   logger): GenerateRunner;
```

#### Parameters

##### options

[`GenerateCommandOptions`](../../GenerateCommand/interfaces/GenerateCommandOptions.md)

##### generateOptions

`Required`\<`ProjectGenerateOptions`\>

##### renderedFiles

[`RenderedFile`](../interfaces/RenderedFile.md)[]

##### logger

`BaseLogger`

#### Returns

`GenerateRunner`

## Properties

### generateOptions

```ts
readonly generateOptions: Required<ProjectGenerateOptions>;
```

***

### logger

```ts
protected readonly logger: BaseLogger;
```

***

### options

```ts
readonly options: GenerateCommandOptions;
```

## Methods

### run()

```ts
run(): Promise<void>;
```

#### Returns

`Promise`\<`void`\>
