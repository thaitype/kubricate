[Documentation](../../../../index.md) / [secret/providers/BaseProvider](../index.md) / CustomEffect

# Interface: CustomEffect\<T\>

## Extends

- [`BaseEffect`](BaseEffect.md)\<`"custom"`, `T`\>

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
type: "custom";
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
