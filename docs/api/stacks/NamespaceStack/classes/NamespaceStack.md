[Documentation](../../index.md) / [NamespaceStack](../index.md) / NamespaceStack

# Class: NamespaceStack

## Extends

- `BaseStack`\<*typeof* `configureComposer`\>

## Constructors

### Constructor

```ts
new NamespaceStack(): NamespaceStack;
```

#### Returns

`NamespaceStack`

#### Overrides

```ts
BaseStack<typeof configureComposer>.constructor
```

## Properties

### \_composer

```ts
_composer: ResourceComposer<Record<"namespace", undefined | Omit<INamespace, keyof TypeMeta>>>;
```

#### Inherited from

```ts
BaseStack._composer
```

***

### \_defaultSecretManagerId

```ts
readonly _defaultSecretManagerId: "default" = "default";
```

#### Inherited from

```ts
BaseStack._defaultSecretManagerId
```

***

### \_name?

```ts
optional _name: string;
```

The name of the stack.
This is used to identify the stack, generally used with GenericStack.

#### Inherited from

```ts
BaseStack._name
```

***

### \_secretManagers

```ts
_secretManagers: Record<number, AnySecretManager>;
```

#### Inherited from

```ts
BaseStack._secretManagers
```

***

### \_targetInjects

```ts
_targetInjects: ProviderInjection<string, string>[];
```

#### Inherited from

```ts
BaseStack._targetInjects
```

***

### logger?

```ts
optional logger: BaseLogger;
```

#### Inherited from

```ts
BaseStack.logger
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

#### Inherited from

```ts
BaseStack.resources
```

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

```ts
BaseStack.build
```

***

### from()

```ts
from(data): NamespaceStack;
```

Configure the stack with the provided data.

#### Parameters

##### data

[`INamespaceStack`](../interfaces/INamespaceStack.md)

The configuration data for the stack.

#### Returns

`NamespaceStack`

The Kubricate Composer instance.

#### Overrides

```ts
BaseStack.from
```

***

### getComposer()

```ts
getComposer(): 
  | undefined
| ResourceComposer<Record<"namespace", undefined | Omit<INamespace, keyof TypeMeta>>>;
```

#### Returns

  \| `undefined`
  \| `ResourceComposer`\<`Record`\<`"namespace"`, `undefined` \| `Omit`\<`INamespace`, keyof `TypeMeta`\>\>\>

#### Inherited from

```ts
BaseStack.getComposer
```

***

### getName()

```ts
getName(): undefined | string;
```

#### Returns

`undefined` \| `string`

#### Inherited from

```ts
BaseStack.getName
```

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

`AnySecretManager`

The secret manager instance.

#### Inherited from

```ts
BaseStack.getSecretManager
```

***

### getSecretManagers()

```ts
getSecretManagers(): Record<number, AnySecretManager>;
```

Get all secret managers in the stack.

#### Returns

`Record`\<`number`, `AnySecretManager`\>

The secret managers in the stack.

#### Inherited from

```ts
BaseStack.getSecretManagers
```

***

### getTargetInjects()

```ts
getTargetInjects(): ProviderInjection<string, string>[];
```

Retrieves all registered secret injections.

#### Returns

`ProviderInjection`\<`string`, `string`\>[]

#### Inherited from

```ts
BaseStack.getTargetInjects
```

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

`BaseLogger`

The logger instance to be injected.

#### Returns

`void`

#### Inherited from

```ts
BaseStack.injectLogger
```

***

### override()

```ts
override(data): this;
```

#### Parameters

##### data

`Partial`\<\{
  `namespace`:   \| `undefined`
     \| `Partial`\<\{
     `metadata?`: `Partial`\<\{
        `annotations?`: `Partial`\<\{
         [`key`: ...]: ...;
        \}\>;
        `creationTimestamp?`: `string`;
        `deletionGracePeriodSeconds?`: `number`;
        `deletionTimestamp?`: `string`;
        `finalizers?`: (... \| ...)[];
        `generateName?`: `string`;
        `generation?`: `number`;
        `labels?`: `Partial`\<\{
         [`key`: ...]: ...;
        \}\>;
        `managedFields?`: (... \| ...)[];
        `name?`: `string`;
        `namespace?`: `string`;
        `ownerReferences?`: (... \| ...)[];
        `resourceVersion?`: `string`;
        `selfLink?`: `string`;
        `uid?`: `string`;
     \}\>;
     `spec?`: `Partial`\<\{
        `finalizers?`: (... \| ...)[];
     \}\>;
     `status?`: `Partial`\<\{
        `conditions?`: (... \| ...)[];
        `phase?`: `"Active"` \| `"Terminating"`;
     \}\>;
   \}\>;
\}\>

#### Returns

`this`

#### Inherited from

```ts
BaseStack.override
```

***

### registerSecretInjection()

```ts
registerSecretInjection(inject): void;
```

Registers a secret injection to be processed during stack build/render.

#### Parameters

##### inject

`ProviderInjection`

#### Returns

`void`

#### Inherited from

```ts
BaseStack.registerSecretInjection
```

***

### setComposer()

```ts
setComposer(composer): void;
```

#### Parameters

##### composer

`ResourceComposer`\<`Record`\<`"namespace"`, `undefined` \| `Omit`\<`INamespace`, keyof `TypeMeta`\>\>\>

#### Returns

`void`

#### Inherited from

```ts
BaseStack.setComposer
```

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

```ts
BaseStack.setName
```

***

### useSecrets()

```ts
useSecrets<NewSecretManager>(secretManager, builder): this;
```

#### Type Parameters

##### NewSecretManager

`NewSecretManager` *extends* `AnySecretManager`

#### Parameters

##### secretManager

`NewSecretManager`

##### builder

(`injector`) => `void`

#### Returns

`this`

#### Inherited from

```ts
BaseStack.useSecrets
```
