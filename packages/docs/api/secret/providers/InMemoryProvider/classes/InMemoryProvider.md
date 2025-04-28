[Documentation](../../../../index.md) / [secret/providers/InMemoryProvider](../index.md) / InMemoryProvider

# Class: InMemoryProvider

## Implements

- [`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md)\<[`InMemoryProviderConfig`](../interfaces/InMemoryProviderConfig.md), `SupportedStrategies`\>

## Constructors

### Constructor

```ts
new InMemoryProvider(config): InMemoryProvider;
```

#### Parameters

##### config

[`InMemoryProviderConfig`](../interfaces/InMemoryProviderConfig.md) = `{}`

#### Returns

`InMemoryProvider`

## Properties

### allowMerge

```ts
readonly allowMerge: true = true;
```

Whether this provider allows merging (default = false)

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`allowMerge`](../../BaseProvider/interfaces/BaseProvider.md#allowmerge)

***

### config

```ts
config: InMemoryProviderConfig;
```

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`config`](../../BaseProvider/interfaces/BaseProvider.md#config-1)

***

### injectes

```ts
injectes: ProviderInjection<string, string>[] = [];
```

***

### name

```ts
name: undefined | string;
```

The name of the provider.
This is used to identify the provider in the config and logs.

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`name`](../../BaseProvider/interfaces/BaseProvider.md#name)

***

### ~~secretType~~

```ts
readonly secretType: "Kubricate.InMemory" = 'Kubricate.InMemory';
```

Defines the target resource type (used for grouping/conflict)

#### Deprecated

the framework will use Provider Class name instead

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`secretType`](../../BaseProvider/interfaces/BaseProvider.md#secrettype)

***

### supportedStrategies

```ts
readonly supportedStrategies: "env"[];
```

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`supportedStrategies`](../../BaseProvider/interfaces/BaseProvider.md#supportedstrategies-1)

***

### targetKind

```ts
readonly targetKind: "Deployment" = 'Deployment';
```

Kubernetes resource kind this provider expects for a given strategy.

e.g. `Deployment`, `StatefulSet`, `DaemonSet`, etc.

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`targetKind`](../../BaseProvider/interfaces/BaseProvider.md#targetkind)

## Methods

### getEffectIdentifier()

```ts
getEffectIdentifier(effect): string;
```

Each provider then defines how its own effects are uniquely identified (for conflict detection).

Optional method to uniquely identify effects emitted by this provider
Used for detecting provider-level conflicts across providers.

If undefined, no cross-provider conflict check will be performed.

#### Parameters

##### effect

[`PreparedEffect`](../../BaseProvider/type-aliases/PreparedEffect.md)

#### Returns

`string`

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`getEffectIdentifier`](../../BaseProvider/interfaces/BaseProvider.md#geteffectidentifier)

***

### getInjectionPayload()

```ts
getInjectionPayload(): unknown;
```

getInjectionPayload() is used to return runtime resource values (e.g., container.env).
This is used during manifest generation (`kubricate generate`) and must be pure.

#### Returns

`unknown`

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`getInjectionPayload`](../../BaseProvider/interfaces/BaseProvider.md#getinjectionpayload)

***

### getTargetPath()

```ts
getTargetPath(strategy): string;
```

Return the Kubernetes path this provider expects for a given strategy.
This is used to generate the target path in the manifest for injection.

#### Parameters

##### strategy

[`SecretInjectionStrategy`](../../../../BaseStack/type-aliases/SecretInjectionStrategy.md)

#### Returns

`string`

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`getTargetPath`](../../BaseProvider/interfaces/BaseProvider.md#gettargetpath)

***

### mergeSecrets()

```ts
mergeSecrets(effects): PreparedEffect[];
```

Merge provider-level effects into final applyable resources.
Used to deduplicate (e.g. K8s secret name + ns).

#### Parameters

##### effects

[`PreparedEffect`](../../BaseProvider/type-aliases/PreparedEffect.md)[]

#### Returns

[`PreparedEffect`](../../BaseProvider/type-aliases/PreparedEffect.md)[]

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`mergeSecrets`](../../BaseProvider/interfaces/BaseProvider.md#mergesecrets)

***

### prepare()

```ts
prepare(name, value): PreparedEffect[];
```

Prepare the secret value for in-memory storage.

#### Parameters

##### name

`string`

##### value

[`SecretValue`](../../../types/type-aliases/SecretValue.md)

#### Returns

[`PreparedEffect`](../../BaseProvider/type-aliases/PreparedEffect.md)[]

#### Implementation of

[`BaseProvider`](../../BaseProvider/interfaces/BaseProvider.md).[`prepare`](../../BaseProvider/interfaces/BaseProvider.md#prepare)

***

### setInjects()

```ts
setInjects(injectes): void;
```

#### Parameters

##### injectes

[`ProviderInjection`](../../BaseProvider/interfaces/ProviderInjection.md)\<`string`, `string`\>[]

#### Returns

`void`
