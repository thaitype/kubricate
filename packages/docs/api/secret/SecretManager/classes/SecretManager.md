[Documentation](../../../index.md) / [secret/SecretManager](../index.md) / SecretManager

# Class: SecretManager\<ConnectorInstances, ProviderInstances, SecretEntries, DefaultProvider\>

SecretManager is a type-safe registry for managing secret providers and their secrets.

- Register provider definitions (with type-safe config).
- Register named provider instances based on those definitions.
- Add secrets referencing the registered providers.

## Type Parameters

### ConnectorInstances

`ConnectorInstances` *extends* `Record`\<`string`, `string`\> = \{
\}

### ProviderInstances

`ProviderInstances` *extends* `Record`\<`string`, [`BaseProvider`](../../providers/BaseProvider/interfaces/BaseProvider.md)\> = \{
\}

### SecretEntries

`SecretEntries` *extends* `Record`\<`string`, \{
  `provider`: keyof `ProviderInstances`;
\}\> = \{
\}

### DefaultProvider

`DefaultProvider` *extends* [`AnyKey`](../../../types/type-aliases/AnyKey.md) = `never`

## Constructors

### Constructor

```ts
new SecretManager<ConnectorInstances, ProviderInstances, SecretEntries, DefaultProvider>(): SecretManager<ConnectorInstances, ProviderInstances, SecretEntries, DefaultProvider>;
```

#### Returns

`SecretManager`\<`ConnectorInstances`, `ProviderInstances`, `SecretEntries`, `DefaultProvider`\>

## Properties

### logger?

```ts
optional logger: BaseLogger;
```

## Methods

### addConnector()

```ts
addConnector<NewConnector>(connector, instance): SecretManager<ConnectorInstances & Record<NewConnector, string>, ProviderInstances, SecretEntries, DefaultProvider>;
```

Adds a new connector instance using a valid connector name

#### Type Parameters

##### NewConnector

`NewConnector` *extends* `string`

#### Parameters

##### connector

`NewConnector`

The unique name of the connector (e.g., 'EnvConnector').

##### instance

[`BaseConnector`](../../connectors/BaseConnector/interfaces/BaseConnector.md)

Configuration specific to the connector type.

#### Returns

`SecretManager`\<`ConnectorInstances` & `Record`\<`NewConnector`, `string`\>, `ProviderInstances`, `SecretEntries`, `DefaultProvider`\>

A SecretManager instance with the connector added.

***

### addProvider()

```ts
addProvider<NewProviderKey, NewProvider>(provider, instance): SecretManager<ConnectorInstances, ProviderInstances & Record<NewProviderKey, NewProvider>, SecretEntries, FallbackIfNever<DefaultProvider, NewProviderKey>>;
```

Registers a new provider instance using a valid provider name

#### Type Parameters

##### NewProviderKey

`NewProviderKey` *extends* `string`

##### NewProvider

`NewProvider` *extends* [`BaseProvider`](../../providers/BaseProvider/interfaces/BaseProvider.md)\<`object`, 
  \| `"env"`
  \| `"volume"`
  \| `"annotation"`
  \| `"imagePullSecret"`
  \| `"envFrom"`
  \| `"plugin"`\>

#### Parameters

##### provider

`NewProviderKey`

The unique name of the provider (e.g., 'Kubernetes.Secret').

##### instance

`NewProvider`

Configuration specific to the provider type.

#### Returns

`SecretManager`\<`ConnectorInstances`, `ProviderInstances` & `Record`\<`NewProviderKey`, `NewProvider`\>, `SecretEntries`, [`FallbackIfNever`](../../../types/type-aliases/FallbackIfNever.md)\<`DefaultProvider`, `NewProviderKey`\>\>

A SecretManager instance with the provider added.

***

### addSecret()

```ts
addSecret<NewSecret, NewProvider>(optionsOrName): SecretManager<ConnectorInstances, ProviderInstances, SecretEntries & Record<NewSecret, {
  provider: ExtractWithDefault<NewProvider, DefaultProvider>;
}>, DefaultProvider>;
```

Adds a new secret to the registry and links it to an existing provider.

#### Type Parameters

##### NewSecret

`NewSecret` *extends* `string`

##### NewProvider

`NewProvider` *extends* `string` \| `number` \| `symbol` = keyof `ProviderInstances`

#### Parameters

##### optionsOrName

SecretOptions

`NewSecret` | [`SecretOptions`](../interfaces/SecretOptions.md)\<`NewSecret`, keyof `ConnectorInstances`, `NewProvider`\>

#### Returns

`SecretManager`\<`ConnectorInstances`, `ProviderInstances`, `SecretEntries` & `Record`\<`NewSecret`, \{
  `provider`: `ExtractWithDefault`\<`NewProvider`, `DefaultProvider`\>;
\}\>, `DefaultProvider`\>

A new SecretManager instance with the secret added.

***

### build()

```ts
build(): SecretManager<ConnectorInstances, ProviderInstances, SecretEntries, DefaultProvider>;
```

**`Internal`**

Internal method to build the SecretManager.
This is not intended for public use.

Post processing step to ensure that all secrets is ready for use.

#### Returns

`SecretManager`\<`ConnectorInstances`, `ProviderInstances`, `SecretEntries`, `DefaultProvider`\>

***

### getConnector()

```ts
getConnector<Config>(key?): BaseConnector<Config>;
```

**`Internal`**

Internal method to get the current providers in the manager.
This is not intended for public use.

#### Type Parameters

##### Config

`Config` *extends* `object` = `object`

#### Parameters

##### key?

[`AnyKey`](../../../types/type-aliases/AnyKey.md)

The unique name of the connector (e.g., 'EnvConnector').

#### Returns

[`BaseConnector`](../../connectors/BaseConnector/interfaces/BaseConnector.md)\<`Config`\>

The connector instance associated with the given key.

#### Throws

Error if the connector is not found.

***

### getConnectors()

```ts
getConnectors(): Record<string, BaseConnector<object>>;
```

#### Returns

`Record`\<`string`, [`BaseConnector`](../../connectors/BaseConnector/interfaces/BaseConnector.md)\<`object`\>\>

***

### getDefaultConnector()

```ts
getDefaultConnector(): undefined | keyof ConnectorInstances;
```

#### Returns

`undefined` \| keyof `ConnectorInstances`

***

### getDefaultProvider()

```ts
getDefaultProvider(): undefined | keyof ProviderInstances;
```

#### Returns

`undefined` \| keyof `ProviderInstances`

***

### getProvider()

```ts
getProvider<Config>(key): BaseProvider<Config>;
```

**`Internal`**

Internal method to get the current providers in the manager.
This is not intended for public use.

#### Type Parameters

##### Config

`Config` *extends* `object` = `object`

#### Parameters

##### key

The unique name of the provider (e.g., 'Kubernetes.Secret').

`undefined` | [`AnyKey`](../../../types/type-aliases/AnyKey.md)

#### Returns

[`BaseProvider`](../../providers/BaseProvider/interfaces/BaseProvider.md)\<`Config`\>

The provider instance associated with the given key.

#### Throws

Error if the provider is not found.

***

### getProviders()

```ts
getProviders(): Record<string, BaseProvider<object, 
  | "env"
  | "volume"
  | "annotation"
  | "imagePullSecret"
  | "envFrom"
| "plugin">>;
```

#### Returns

`Record`\<`string`, [`BaseProvider`](../../providers/BaseProvider/interfaces/BaseProvider.md)\<`object`, 
  \| `"env"`
  \| `"volume"`
  \| `"annotation"`
  \| `"imagePullSecret"`
  \| `"envFrom"`
  \| `"plugin"`\>\>

***

### getSecrets()

```ts
getSecrets(): Record<string, SecretOptions<string, AnyKey, AnyKey>>;
```

#### Returns

`Record`\<`string`, [`SecretOptions`](../interfaces/SecretOptions.md)\<`string`, [`AnyKey`](../../../types/type-aliases/AnyKey.md), [`AnyKey`](../../../types/type-aliases/AnyKey.md)\>\>

The current secrets in the registry.

#### Interal

Internal method to get the current secrets in the manager.
This is not intended for public use.

***

### prepare()

```ts
prepare(): Promise<SecretManagerEffect[]>;
```

**`Internal`**

Internal method to get the current providers in the manager.
This is not intended for public use.

Prepares secrets using registered connectors and providers.
This does not perform any side-effects like `kubectl`.

#### Returns

`Promise`\<[`SecretManagerEffect`](../interfaces/SecretManagerEffect.md)[]\>

An array of SecretManagerEffect objects, each containing the name, value, and effects of the secret.

#### Throws

Error if a connector or provider is not found for a secret.

***

### resolveConnector()

```ts
resolveConnector(connector?): BaseConnector;
```

#### Parameters

##### connector?

[`AnyKey`](../../../types/type-aliases/AnyKey.md)

#### Returns

[`BaseConnector`](../../connectors/BaseConnector/interfaces/BaseConnector.md)

***

### resolveProvider()

```ts
resolveProvider(provider?): BaseProvider;
```

#### Parameters

##### provider?

[`AnyKey`](../../../types/type-aliases/AnyKey.md)

#### Returns

[`BaseProvider`](../../providers/BaseProvider/interfaces/BaseProvider.md)

***

### resolveProviderFor()

```ts
resolveProviderFor(secretName): object;
```

Resolves the registered provider instance for a given secret name.
This method is used during the secret injection planning phase (e.g., `useSecrets`)
and does not resolve or load secret values.

#### Parameters

##### secretName

`string`

The name of the secret to resolve.

#### Returns

`object`

The BaseProvider associated with the secret.

##### providerId

```ts
providerId: string;
```

##### providerInstance

```ts
providerInstance: BaseProvider;
```

#### Throws

If the secret is not registered or has no provider.

***

### resolveSecretValueForApply()

```ts
resolveSecretValueForApply(secretName): Promise<{
  provider: BaseProvider;
  value: SecretValue;
}>;
```

Resolves the actual secret value and its associated provider for a given secret name.
This method is used at runtime when the secret is being applied (e.g., `secret apply`).
It loads the value from the appropriate connector and returns both the value and the provider.

#### Parameters

##### secretName

`string`

The name of the secret to resolve and load.

#### Returns

`Promise`\<\{
  `provider`: [`BaseProvider`](../../providers/BaseProvider/interfaces/BaseProvider.md);
  `value`: [`SecretValue`](../../types/type-aliases/SecretValue.md);
\}\>

An object containing the resolved provider and loaded secret value.

#### Throws

If the secret is not registered or its connector/provider cannot be found.

***

### setDefaultConnector()

```ts
setDefaultConnector(connector): SecretManager<ConnectorInstances, ProviderInstances, SecretEntries, DefaultProvider>;
```

Sets the default connector for the SecretManager.
This connector will be used if no specific connector is specified when adding a secret.

Connectors support multiple instances, so this is a way to set a default.

#### Parameters

##### connector

keyof `ConnectorInstances`

The unique name of the connector (e.g., 'EnvConnector').

#### Returns

`SecretManager`\<`ConnectorInstances`, `ProviderInstances`, `SecretEntries`, `DefaultProvider`\>

A SecretManager instance with the connector added.

***

### setDefaultProvider()

```ts
setDefaultProvider<NewDefaultProvider>(provider): SecretManager<ConnectorInstances, ProviderInstances, SecretEntries, NewDefaultProvider>;
```

Sets the default provider for the SecretManager.
This provider will be used if no specific provider is specified when adding a secret.

Providers support multiple instances, so this is a way to set a default.

#### Type Parameters

##### NewDefaultProvider

`NewDefaultProvider` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### provider

`NewDefaultProvider`

The unique name of the provider (e.g., 'Kubernetes.Secret').

#### Returns

`SecretManager`\<`ConnectorInstances`, `ProviderInstances`, `SecretEntries`, `NewDefaultProvider`\>

A SecretManager instance with the provider added.
