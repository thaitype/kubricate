[Documentation](../../../index.md) / [secret/SecretManager](../index.md) / SecretOptions

# Interface: SecretOptions\<NewSecret, Connector, Provider\>

SecretOptions defines the structure of a secret entry in the SecretManager.
It includes the name of the secret, the connector to use for loading it,
and the provider to use for resolving it.

## Type Parameters

### NewSecret

`NewSecret` *extends* `string` = `string`

### Connector

`Connector` *extends* [`AnyKey`](../../../types/type-aliases/AnyKey.md) = [`AnyKey`](../../../types/type-aliases/AnyKey.md)

### Provider

`Provider` *extends* [`AnyKey`](../../../types/type-aliases/AnyKey.md) = [`AnyKey`](../../../types/type-aliases/AnyKey.md)

## Properties

### connector?

```ts
optional connector: Connector;
```

Connector instance to use for loading the secret.
If not provided, the default connector will be used.

***

### name

```ts
name: NewSecret;
```

Name of the secret to be added.
This name must be unique within the SecretManager instance.

***

### provider?

```ts
optional provider: Provider;
```

Key of a registered provider instance.
If not provided, the default provider will be used.
