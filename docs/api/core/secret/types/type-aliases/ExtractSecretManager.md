[Documentation](../../../index.md) / [secret/types](../index.md) / ExtractSecretManager

# Type Alias: ExtractSecretManager\<Registry\>

```ts
type ExtractSecretManager<Registry> = object;
```

ponents from a SecretManager instance.

## Type Parameters

### Registry

`Registry` *extends* [`AnySecretManager`](AnySecretManager.md)

## Properties

### connectorInstances

```ts
connectorInstances: Registry extends SecretManager<infer LI, any, any> ? LI : never;
```

***

### providerInstances

```ts
providerInstances: Registry extends SecretManager<any, infer PI, any> ? PI : never;
```

***

### secretEntries

```ts
secretEntries: Registry extends SecretManager<any, any, infer SE> ? SE : never;
```
