[Documentation](../../index.md) / [createStack](../index.md) / GenericStack

# Class: GenericStack\<Data, Entries\>

BaseStack is the base class for all stacks.

## Note

BaseStack fields and methods need to be public, type inference is not working with private fields when using with `createSt`

## Extends

- [`BaseStack`](../../BaseStack/classes/BaseStack.md)\<[`ConfigureComposerFunction`](../type-aliases/ConfigureComposerFunction.md)\<`Data`, `Entries`\>\>

## Type Parameters

### Data

`Data`

### Entries

`Entries` *extends* `Record`\<`string`, `unknown`\>

## Constructors

### Constructor

```ts
new GenericStack<Data, Entries>(builder): GenericStack<Data, Entries>;
```

#### Parameters

##### builder

[`ConfigureComposerFunction`](../type-aliases/ConfigureComposerFunction.md)\<`Data`, `Entries`\>

#### Returns

`GenericStack`\<`Data`, `Entries`\>

#### Overrides

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`constructor`](../../BaseStack/classes/BaseStack.md#constructor)

## Properties

### \_composer

```ts
_composer: ResourceComposer<Entries>;
```

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`_composer`](../../BaseStack/classes/BaseStack.md#_composer)

***

### \_defaultSecretManagerId

```ts
readonly _defaultSecretManagerId: "default" = 'default';
```

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`_defaultSecretManagerId`](../../BaseStack/classes/BaseStack.md#_defaultsecretmanagerid)

***

### \_name?

```ts
optional _name: string;
```

The name of the stack.
This is used to identify the stack, generally used with GenericStack.

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`_name`](../../BaseStack/classes/BaseStack.md#_name)

***

### \_secretManagers

```ts
_secretManagers: Record<number, AnySecretManager> = {};
```

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`_secretManagers`](../../BaseStack/classes/BaseStack.md#_secretmanagers)

***

### \_targetInjects

```ts
_targetInjects: ProviderInjection<string, string>[] = [];
```

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`_targetInjects`](../../BaseStack/classes/BaseStack.md#_targetinjects)

***

### builder

```ts
builder: ConfigureComposerFunction<Data, Entries>;
```

***

### logger?

```ts
optional logger: BaseLogger;
```

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`logger`](../../BaseStack/classes/BaseStack.md#logger)

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

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`resources`](../../BaseStack/classes/BaseStack.md#resources)

## Methods

### build()

```ts
build(): Record<string, unknown>;
```

Build the stack and return the resources.

#### Returns

`Record`\<`string`, `unknown`\>

The resources in the stack.

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`build`](../../BaseStack/classes/BaseStack.md#build)

***

### from()

```ts
from(data): GenericStack<Data, Entries>;
```

Configure the stack with the provided data.

#### Parameters

##### data

`Data`

The configuration data for the stack.

#### Returns

`GenericStack`\<`Data`, `Entries`\>

The Kubricate Composer instance.

#### Overrides

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`from`](../../BaseStack/classes/BaseStack.md#from)

***

### getComposer()

```ts
getComposer(): 
  | undefined
| ResourceComposer<Entries>;
```

#### Returns

  \| `undefined`
  \| [`ResourceComposer`](../../ResourceComposer/classes/ResourceComposer.md)\<`Entries`\>

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`getComposer`](../../BaseStack/classes/BaseStack.md#getcomposer)

***

### getName()

```ts
getName(): undefined | string;
```

#### Returns

`undefined` \| `string`

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`getName`](../../BaseStack/classes/BaseStack.md#getname)

***

### getSecretManager()

```ts
getSecretManager(id): AnySecretManager;
```

Get the secret manager instance.

#### Parameters

##### id

`number`

The ID of the secret manager. defaults to 'default'.

#### Returns

[`AnySecretManager`](../../secret/types/type-aliases/AnySecretManager.md)

The secret manager instance.

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`getSecretManager`](../../BaseStack/classes/BaseStack.md#getsecretmanager)

***

### getSecretManagers()

```ts
getSecretManagers(): Record<number, AnySecretManager>;
```

Get all secret managers in the stack.

#### Returns

`Record`\<`number`, [`AnySecretManager`](../../secret/types/type-aliases/AnySecretManager.md)\>

The secret managers in the stack.

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`getSecretManagers`](../../BaseStack/classes/BaseStack.md#getsecretmanagers)

***

### getTargetInjects()

```ts
getTargetInjects(): ProviderInjection<string, string>[];
```

Retrieves all registered secret injections.

#### Returns

[`ProviderInjection`](../../secret/providers/BaseProvider/interfaces/ProviderInjection.md)\<`string`, `string`\>[]

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`getTargetInjects`](../../BaseStack/classes/BaseStack.md#gettargetinjects)

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

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`injectLogger`](../../BaseStack/classes/BaseStack.md#injectlogger)

***

### override()

```ts
override(data): GenericStack<Data, Entries>;
```

#### Parameters

##### data

`Equal`\<`Entries`, *typeof* `_`\> *extends* `true` ? \[\] : \[`Entries`\] *extends* `args` ? `args` : `never` *extends* \[`pipedFirst`, `...pipedRest[]`\] ? \[`pipedFirst`, `...pipedRest[]`\] : \[\] *extends* `args` ? `args` *extends* `args` ? `args` : `never` *extends* \[`obj`\] ? `TransformObjectDeep`\<`PartialFn`, `obj`\> : `never` : `never`

#### Returns

`GenericStack`\<`Data`, `Entries`\>

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`override`](../../BaseStack/classes/BaseStack.md#override)

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

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`registerSecretInjection`](../../BaseStack/classes/BaseStack.md#registersecretinjection)

***

### setComposer()

```ts
setComposer(composer): void;
```

#### Parameters

##### composer

[`ResourceComposer`](../../ResourceComposer/classes/ResourceComposer.md)\<`Entries`\>

#### Returns

`void`

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`setComposer`](../../BaseStack/classes/BaseStack.md#setcomposer)

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

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`setName`](../../BaseStack/classes/BaseStack.md#setname)

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

#### Inherited from

[`BaseStack`](../../BaseStack/classes/BaseStack.md).[`useSecrets`](../../BaseStack/classes/BaseStack.md#usesecrets)
