[Documentation](../../../index.md) / [secret/SecretsInjectionContext](../index.md) / GetProviderKinds

# Type Alias: GetProviderKinds\<SM, Key\>

```ts
type GetProviderKinds<SM, Key> = GetProviderKindFromConnector<SM, ExtractProviderKeyFromSecretManager<SM, Key>>;
```

## Type Parameters

### SM

`SM` *extends* [`AnySecretManager`](../../types/type-aliases/AnySecretManager.md)

### Key

`Key` *extends* keyof [`ExtractSecretManager`](../../types/type-aliases/ExtractSecretManager.md)\<`SM`\>\[`"secretEntries"`\]
