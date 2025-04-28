[Documentation](../../../../index.md) / [secret/providers/BaseProvider](../index.md) / BaseEffect

# Interface: BaseEffect\<Type, T\>

## Extended by

- [`CustomEffect`](CustomEffect.md)
- [`KubectlEffect`](KubectlEffect.md)

## Type Parameters

### Type

`Type` *extends* `string`

### T

`T` = `unknown`

## Properties

### providerName

```ts
providerName: undefined | string;
```

***

### secretName?

```ts
optional secretName: string;
```

***

### type

```ts
type: Type;
```

***

### value

```ts
value: T;
```
