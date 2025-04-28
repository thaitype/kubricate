[Documentation](../../index.md) / [types](../index.md) / FallbackIfNever

# Type Alias: FallbackIfNever\<T, Fallback\>

```ts
type FallbackIfNever<T, Fallback> = IsNever<T> extends true ? Fallback : T;
```

FallbackIfNever checks if the type T is never, and if so, returns the fallback type.
Otherwise, it returns the original type T.

## Type Parameters

### T

`T`

### Fallback

`Fallback`
