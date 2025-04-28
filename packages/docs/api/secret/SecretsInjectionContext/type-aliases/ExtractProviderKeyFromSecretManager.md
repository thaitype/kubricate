[Documentation](../../../index.md) / [secret/SecretsInjectionContext](../index.md) / ExtractProviderKeyFromSecretManager

# Type Alias: ExtractProviderKeyFromSecretManager\<SM, Key\>

```ts
type ExtractProviderKeyFromSecretManager<SM, Key> = ExtractSecretManager<SM>["secretEntries"][Key] extends object ? P : never;
```

## Type Parameters

### SM

`SM` *extends* [`AnySecretManager`](../../types/type-aliases/AnySecretManager.md)

### Key

`Key` *extends* keyof [`ExtractSecretManager`](../../types/type-aliases/ExtractSecretManager.md)\<`SM`\>\[`"secretEntries"`\]
