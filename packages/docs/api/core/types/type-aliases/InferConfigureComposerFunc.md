[Documentation](../../index.md) / [types](../index.md) / InferConfigureComposerFunc

# Type Alias: InferConfigureComposerFunc\<T\>

```ts
type InferConfigureComposerFunc<T> = T extends (...args) => ResourceComposer<infer R> ? R : never;
```

## Type Parameters

### T

`T`
