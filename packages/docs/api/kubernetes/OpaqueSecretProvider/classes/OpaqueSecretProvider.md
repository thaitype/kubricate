[Documentation](../../index.md) / [OpaqueSecretProvider](../index.md) / OpaqueSecretProvider

# Class: OpaqueSecretProvider

OpaqueSecretProvider is a provider that uses Kubernetes secrets to inject secrets into the application.
It uses the Kubernetes API to create a secret with the given name and value.
The secret is created in the specified namespace.

## See

https://kubernetes.io/docs/concepts/configuration/secret/

## Implements

- `BaseProvider`\<[`OpaqueSecretProviderConfig`](../interfaces/OpaqueSecretProviderConfig.md), `SupportedStrategies`\>

## Constructors

### Constructor

```ts
new OpaqueSecretProvider(config): OpaqueSecretProvider;
```

#### Parameters

##### config

[`OpaqueSecretProviderConfig`](../interfaces/OpaqueSecretProviderConfig.md)

#### Returns

`OpaqueSecretProvider`

## Properties

### allowMerge

```ts
readonly allowMerge: true = true;
```

Whether this provider allows merging (default = false)

#### Implementation of

```ts
BaseProvider.allowMerge
```

***

### config

```ts
config: OpaqueSecretProviderConfig;
```

#### Implementation of

```ts
BaseProvider.config
```

***

### logger?

```ts
optional logger: BaseLogger;
```

#### Implementation of

```ts
BaseProvider.logger
```

***

### name

```ts
name: undefined | string;
```

The name of the provider.
This is used to identify the provider in the config and logs.

#### Implementation of

```ts
BaseProvider.name
```

***

### ~~secretType~~

```ts
readonly secretType: "Kubernetes.Secret.Opaque" = 'Kubernetes.Secret.Opaque';
```

Defines the target resource type (used for grouping/conflict)

#### Deprecated

the framework will use Provider Class name instead

#### Implementation of

```ts
BaseProvider.secretType
```

***

### supportedStrategies

```ts
readonly supportedStrategies: "env"[];
```

#### Implementation of

```ts
BaseProvider.supportedStrategies
```

***

### targetKind

```ts
readonly targetKind: "Deployment" = 'Deployment';
```

Kubernetes resource kind this provider expects for a given strategy.

e.g. `Deployment`, `StatefulSet`, `DaemonSet`, etc.

#### Implementation of

```ts
BaseProvider.targetKind
```

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

`PreparedEffect`

#### Returns

`string`

#### Implementation of

```ts
BaseProvider.getEffectIdentifier
```

***

### getInjectionPayload()

```ts
getInjectionPayload(injectes): EnvVar[];
```

getInjectionPayload() is used to return runtime resource values (e.g., container.env).
This is used during manifest generation (`kubricate generate`) and must be pure.

#### Parameters

##### injectes

`ProviderInjection`\<`string`, `string`\>[]

#### Returns

[`EnvVar`](../interfaces/EnvVar.md)[]

#### Implementation of

```ts
BaseProvider.getInjectionPayload
```

***

### getTargetPath()

```ts
getTargetPath(strategy): string;
```

Return the Kubernetes path this provider expects for a given strategy.
This is used to generate the target path in the manifest for injection.

#### Parameters

##### strategy

`SecretInjectionStrategy`

#### Returns

`string`

#### Implementation of

```ts
BaseProvider.getTargetPath
```

***

### mergeSecrets()

```ts
mergeSecrets(effects): PreparedEffect[];
```

Merge provider-level effects into final applyable resources.
Used to deduplicate (e.g. K8s secret name + ns).

#### Parameters

##### effects

`PreparedEffect`[]

#### Returns

`PreparedEffect`[]

#### Implementation of

```ts
BaseProvider.mergeSecrets
```

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

`string`

#### Returns

`PreparedEffect`[]

#### Implementation of

```ts
BaseProvider.prepare
```
