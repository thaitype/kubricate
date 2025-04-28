[Documentation](../../../index.md) / [secret/types](../index.md) / EnvOptions

# Interface: EnvOptions\<EnvSecretRef\>

Represents the options for environment variables in a Kubernetes deployment.

## Type Parameters

### EnvSecretRef

`EnvSecretRef` *extends* [`AnyKey`](../../../types/type-aliases/AnyKey.md) = `string`

## Properties

### name

```ts
name: string;
```

Environment variable name

***

### secretRef?

```ts
optional secretRef: EnvSecretRef;
```

Environment variable value from a secret

***

### value?

```ts
optional value: string;
```

Environment variable value
