[Documentation](../../../../index.md) / [secret/providers/BaseProvider](../index.md) / BaseProvider

# Interface: BaseProvider\<Config, SupportedStrategies\>

## Type Parameters

### Config

`Config` *extends* `object` = `object`

### SupportedStrategies

`SupportedStrategies` *extends* [`SecretInjectionStrategy`](../../../../BaseStack/type-aliases/SecretInjectionStrategy.md)\[`"kind"`\] = [`SecretInjectionStrategy`](../../../../BaseStack/type-aliases/SecretInjectionStrategy.md)\[`"kind"`\]

## Properties

### allowMerge?

```ts
readonly optional allowMerge: boolean;
```

Whether this provider allows merging (default = false)

***

### config

```ts
config: Config;
```

***

### logger?

```ts
optional logger: BaseLogger;
```

***

### name

```ts
name: undefined | string;
```

The name of the provider.
This is used to identify the provider in the config and logs.

***

### ~~secretType?~~

```ts
readonly optional secretType: string;
```

Defines the target resource type (used for grouping/conflict)

#### Deprecated

the framework will use Provider Class name instead

***

### supportedStrategies

```ts
readonly supportedStrategies: SupportedStrategies[];
```

***

### targetKind

```ts
readonly targetKind: string;
```

Kubernetes resource kind this provider expects for a given strategy.

e.g. `Deployment`, `StatefulSet`, `DaemonSet`, etc.

## Methods

### getEffectIdentifier()?

```ts
optional getEffectIdentifier(effect): string;
```

Each provider then defines how its own effects are uniquely identified (for conflict detection).

Optional method to uniquely identify effects emitted by this provider
Used for detecting provider-level conflicts across providers.

If undefined, no cross-provider conflict check will be performed.

#### Parameters

##### effect

[`PreparedEffect`](../type-aliases/PreparedEffect.md)

#### Returns

`string`

***

### getInjectionPayload()

```ts
getInjectionPayload(injectes): unknown;
```

getInjectionPayload() is used to return runtime resource values (e.g., container.env).
This is used during manifest generation (`kubricate generate`) and must be pure.

#### Parameters

##### injectes

[`ProviderInjection`](ProviderInjection.md)\<`string`, `string`\>[]

#### Returns

`unknown`

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

***

### mergeSecrets()?

```ts
optional mergeSecrets(effects): PreparedEffect[];
```

#### Parameters

##### effects

[`PreparedEffect`](../type-aliases/PreparedEffect.md)[]

#### Returns

[`PreparedEffect`](../type-aliases/PreparedEffect.md)[]

***

### prepare()

```ts
prepare(name, value): PreparedEffect[];
```

prepare() is used to provision secret values into the cluster or remote backend.
It is only called during `kubricate secret apply`.

It should return the full secret resource (e.g., Kubernetes Secret, Vault payload).

#### Parameters

##### name

`string`

##### value

[`SecretValue`](../../../types/type-aliases/SecretValue.md)

#### Returns

[`PreparedEffect`](../type-aliases/PreparedEffect.md)[]
