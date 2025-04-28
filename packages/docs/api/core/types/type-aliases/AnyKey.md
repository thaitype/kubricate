[Documentation](../../index.md) / [types](../index.md) / AnyKey

# Type Alias: AnyKey

```ts
type AnyKey = string | number | symbol;
```

Accept any type of key, including string, number, or symbol, Like `keyof any`.
This is useful for generic programming where the key type is not known in advance.
It allows for more flexibility in defining data structures and algorithms that can work with different key types.
