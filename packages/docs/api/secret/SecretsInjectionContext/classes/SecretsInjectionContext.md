[Documentation](../../../index.md) / [secret/SecretsInjectionContext](../index.md) / SecretsInjectionContext

# Class: SecretsInjectionContext\<SM\>

## Type Parameters

### SM

`SM` *extends* [`SecretManager`](../../SecretManager/classes/SecretManager.md) = [`AnySecretManager`](../../types/type-aliases/AnySecretManager.md)

## Constructors

### Constructor

```ts
new SecretsInjectionContext<SM>(
   stack, 
   manager, 
secretManagerId): SecretsInjectionContext<SM>;
```

#### Parameters

##### stack

[`BaseStack`](../../../BaseStack/classes/BaseStack.md)

##### manager

`SM`

##### secretManagerId

`number`

#### Returns

`SecretsInjectionContext`\<`SM`\>

## Methods

### resolveAll()

```ts
resolveAll(): void;
```

#### Returns

`void`

***

### secrets()

```ts
secrets<NewKey, ProviderKinds>(secretName): SecretInjectionBuilder<ProviderKinds>;
```

Start defining how a secret will be injected into a resource.
This only resolves the provider, not the actual secret value.

#### Type Parameters

##### NewKey

`NewKey` *extends* `string` \| `number` \| `symbol` = keyof `SM` *extends* [`SecretManager`](../../SecretManager/classes/SecretManager.md)\<`any`, `any`, `SE`, `never`\> ? `SE` : `never`

##### ProviderKinds

`ProviderKinds` *extends* 
  \| `"env"`
  \| `"volume"`
  \| `"annotation"`
  \| `"imagePullSecret"`
  \| `"envFrom"`
  \| `"plugin"` = [`GetProviderKindFromConnector`](../type-aliases/GetProviderKindFromConnector.md)\<`SM`, [`ExtractProviderKeyFromSecretManager`](../type-aliases/ExtractProviderKeyFromSecretManager.md)\<`SM`, `NewKey`\>\>

#### Parameters

##### secretName

`NewKey`

The name of the secret to inject.

#### Returns

[`SecretInjectionBuilder`](../../SecretInjectionBuilder/classes/SecretInjectionBuilder.md)\<`ProviderKinds`\>

A SecretInjectionBuilder for chaining inject behavior.

***

### setDefaultResourceId()

```ts
setDefaultResourceId(id): void;
```

Set the default resourceId to use when no explicit resource is defined in a secret injection.

#### Parameters

##### id

`string`

#### Returns

`void`
