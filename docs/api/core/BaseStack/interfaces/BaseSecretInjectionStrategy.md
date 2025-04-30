[Documentation](../../index.md) / [BaseStack](../index.md) / BaseSecretInjectionStrategy

# Interface: BaseSecretInjectionStrategy

## Properties

### targetPath?

```ts
optional targetPath: string;
```

Override the default target path for the secret injection.

Moreover, each provider has a default target path for the secret injection.
By using BaseProvider.getTargetPath()
