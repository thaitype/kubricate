[Documentation](../../../index.md) / [secret/SecretsInjectionContext](../index.md) / GetProviderKindFromConnector

# Type Alias: GetProviderKindFromConnector\<SM, ProviderKey\>

```ts
type GetProviderKindFromConnector<SM, ProviderKey> = ProviderKey extends string ? ExtractSecretManager<SM>["providerInstances"][ProviderKey] extends BaseProvider<any, infer Instance> ? Instance : never : never;
```

## Type Parameters

### SM

`SM` *extends* [`AnySecretManager`](../../types/type-aliases/AnySecretManager.md)

### ProviderKey

`ProviderKey`
