[Documentation](../../index.md) / [BaseStack](../index.md) / BaseStack

# Class: `abstract` BaseStack\<ConfigureComposerFunc, SecretManager\>

BaseStack is the base class for all stacks.

## Note

BaseStack fields and methods need to be public, type inference is not working with private fields when using with `createSt`

## Extended by

- [`GenericStack`](../../createStack/classes/GenericStack.md)

## Type Parameters

### ConfigureComposerFunc

`ConfigureComposerFunc` *extends* [`FunctionLike`](../../types/type-aliases/FunctionLike.md)\<`any`[], [`ResourceComposer`](../../ResourceComposer/classes/ResourceComposer.md)\> = [`FunctionLike`](../../types/type-aliases/FunctionLike.md)\<`any`, [`ResourceComposer`](../../ResourceComposer/classes/ResourceComposer.md)\>

### SecretManager

`SecretManager` *extends* [`AnySecretManager`](../../secret/types/type-aliases/AnySecretManager.md) = [`AnySecretManager`](../../secret/types/type-aliases/AnySecretManager.md)

## Constructors

### Constructor

```ts
new BaseStack<ConfigureComposerFunc, SecretManager>(): BaseStack<ConfigureComposerFunc, SecretManager>;
```

#### Returns

`BaseStack`\<`ConfigureComposerFunc`, `SecretManager`\>

## Properties

### \_composer

```ts
_composer: ReturnType<ConfigureComposerFunc>;
```

***

### \_defaultSecretManagerId

```ts
readonly _defaultSecretManagerId: "default" = 'default';
```

***

### \_name?

```ts
optional _name: string;
```

The name of the stack.
This is used to identify the stack, generally used with GenericStack.

***

### \_secretManagers

```ts
_secretManagers: Record<number, SecretManager> = {};
```

***

### \_targetInjects

```ts
_targetInjects: ProviderInjection<string, string>[] = [];
```

***

### logger?

```ts
optional logger: BaseLogger;
```

## Accessors

### resources

#### Get Signature

```ts
get resources(): ReturnType<ConfigureComposerFunc>;
```

Get the resources from the composer.

##### Returns

`ReturnType`\<`ConfigureComposerFunc`\>

The resources from the composer.

## Methods

### build()

```ts
build(): Record<string, unknown>;
```

Build the stack and return the resources.

#### Returns

`Record`\<`string`, `unknown`\>

The resources in the stack.

***

### from()

```ts
abstract from(data): unknown;
```

Configure the stack with the provided data.

#### Parameters

##### data

`unknown`

The configuration data for the stack.

#### Returns

`unknown`

The Kubricate Composer instance.

***

### getComposer()

```ts
getComposer(): undefined | ReturnType<ConfigureComposerFunc>;
```

#### Returns

`undefined` \| `ReturnType`\<`ConfigureComposerFunc`\>

***

### getName()

```ts
getName(): undefined | string;
```

#### Returns

`undefined` \| `string`

***

### getSecretManager()

```ts
getSecretManager(id): SecretManager;
```

Get the secret manager instance.

#### Parameters

##### id

`number`

The ID of the secret manager. defaults to 'default'.

#### Returns

`SecretManager`

The secret manager instance.

***

### getSecretManagers()

```ts
getSecretManagers(): Record<number, SecretManager>;
```

Get all secret managers in the stack.

#### Returns

`Record`\<`number`, `SecretManager`\>

The secret managers in the stack.

***

### getTargetInjects()

```ts
getTargetInjects(): ProviderInjection<string, string>[];
```

Retrieves all registered secret injections.

#### Returns

[`ProviderInjection`](../../secret/providers/BaseProvider/interfaces/ProviderInjection.md)\<`string`, `string`\>[]

***

### injectLogger()

```ts
injectLogger(logger): void;
```

**`Internal`**

This method is used to inject the logger into the stack.
It is called by the orchestrator to inject the logger into all components of the stack.

Inject a logger instance into all components of the stack e.g. secret managers, connector, providers, etc.
This is useful for logging purposes and debugging.

#### Parameters

##### logger

[`BaseLogger`](../../types/interfaces/BaseLogger.md)

The logger instance to be injected.

#### Returns

`void`

***

### override()

```ts
override(data): BaseStack<ConfigureComposerFunc, SecretManager>;
```

#### Parameters

##### data

`Equal`\<[`InferConfigureComposerFunc`](../../types/type-aliases/InferConfigureComposerFunc.md)\<`ConfigureComposerFunc`\>, *typeof* `_`\> *extends* `true` ? \[\] : \[[`InferConfigureComposerFunc`](../../types/type-aliases/InferConfigureComposerFunc.md)\<`ConfigureComposerFunc`\>\] *extends* `args` ? `args` : `never` *extends* \[`pipedFirst`, `...pipedRest[]`\] ? \[`pipedFirst`, `...pipedRest[]`\] : \[\] *extends* `args` ? `args` *extends* `args` ? `args` : `never` *extends* \[`obj`\] ? `TransformObjectDeep`\<`PartialFn`, `obj`\> : `never` : `never`

#### Returns

`BaseStack`\<`ConfigureComposerFunc`, `SecretManager`\>

***

### registerSecretInjection()

```ts
registerSecretInjection(inject): void;
```

Registers a secret injection to be processed during stack build/render.

#### Parameters

##### inject

[`ProviderInjection`](../../secret/providers/BaseProvider/interfaces/ProviderInjection.md)

#### Returns

`void`

***

### setComposer()

```ts
setComposer(composer): void;
```

#### Parameters

##### composer

`ReturnType`\<`ConfigureComposerFunc`\>

#### Returns

`void`

***

### setName()

```ts
setName(name): void;
```

#### Parameters

##### name

`string`

#### Returns

`void`

***

### useSecrets()

```ts
useSecrets<NewSecretManager>(secretManager, builder): this;
```

#### Type Parameters

##### NewSecretManager

`NewSecretManager` *extends* [`AnySecretManager`](../../secret/types/type-aliases/AnySecretManager.md)

#### Parameters

##### secretManager

`NewSecretManager`

##### builder

(`injector`) => `void`

#### Returns

`this`
