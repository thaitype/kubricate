[Documentation](../../../../index.md) / [secret/providers/BaseProvider](../index.md) / KubectlEffect

# Interface: KubectlEffect\<T\>

KubectlEffect is used to apply a value to a resource using kubectl.
This will apply automatically to the resource when it is created.

## Extends

- [`BaseEffect`](BaseEffect.md)\<`"kubectl"`, `T`\>

## Type Parameters

### T

`T` *extends* `object` = `any`

## Properties

### providerName

```ts
providerName: undefined | string;
```

#### Inherited from

[`BaseEffect`](BaseEffect.md).[`providerName`](BaseEffect.md#providername)

***

### secretName?

```ts
optional secretName: string;
```

#### Inherited from

[`BaseEffect`](BaseEffect.md).[`secretName`](BaseEffect.md#secretname)

***

### type

```ts
type: "kubectl";
```

#### Inherited from

[`BaseEffect`](BaseEffect.md).[`type`](BaseEffect.md#type-1)

***

### value

```ts
value: T;
```

#### Inherited from

[`BaseEffect`](BaseEffect.md).[`value`](BaseEffect.md#value)
