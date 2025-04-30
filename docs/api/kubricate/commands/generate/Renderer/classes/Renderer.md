[Documentation](../../../../index.md) / [commands/generate/Renderer](../index.md) / Renderer

# Class: Renderer

## Constructors

### Constructor

```ts
new Renderer(globalOptions, logger): Renderer;
```

#### Parameters

##### globalOptions

`KubricateConfig`

##### logger

`BaseLogger`

#### Returns

`Renderer`

## Properties

### metadata

```ts
readonly metadata: Required<ProjectMetadataOptions>;
```

## Methods

### injectMetadata()

```ts
injectMetadata(resources, options): Record<string, unknown>;
```

#### Parameters

##### resources

`Record`\<`string`, `unknown`\>

##### options

###### stackId?

`string`

###### stackName?

`string`

#### Returns

`Record`\<`string`, `unknown`\>

***

### renderStacks()

```ts
renderStacks(config): RenderedResource[];
```

#### Parameters

##### config

`KubricateConfig`

#### Returns

[`RenderedResource`](../interfaces/RenderedResource.md)[]

***

### resolveOutputPath()

```ts
resolveOutputPath(
   resource, 
   mode, 
   stdout): string;
```

#### Parameters

##### resource

[`RenderedResource`](../interfaces/RenderedResource.md)

##### mode

`undefined` | `"flat"` | `"stack"` | `"resource"`

##### stdout

`boolean`

#### Returns

`string`
