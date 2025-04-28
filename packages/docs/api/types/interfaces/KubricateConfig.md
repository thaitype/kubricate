[Documentation](../../index.md) / [types](../index.md) / KubricateConfig

# Interface: KubricateConfig

## Properties

### generate?

```ts
optional generate: ProjectGenerateOptions;
```

***

### metadata?

```ts
optional metadata: ProjectMetadataOptions;
```

***

### secret?

```ts
optional secret: ProjectSecretOptions;
```

Secret configuration

***

### ~~secrets?~~

```ts
optional secrets: ProjectSecretOptions;
```

Secrets configuration

#### Deprecated

Use `secret` instead

***

### stacks?

```ts
optional stacks: Record<string, BaseStack<FunctionLike<any, ResourceComposer<{
}>>, AnySecretManager>>;
```
