[Documentation](../../index.md) / [types](../index.md) / IsNever

# Type Alias: IsNever\<T\>

```ts
type IsNever<T> = [T] extends [never] ? true : false;
```

Check is the type is never, return true if the type is never, false otherwise.

## Type Parameters

### T

`T`
