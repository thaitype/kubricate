[Documentation](../../index.md) / [ResourceComposer](../index.md) / ResourceEntry

# Interface: ResourceEntry

## Properties

### config

```ts
config: Record<string, unknown>;
```

***

### entryType

```ts
entryType: "object" | "class" | "instance";
```

The kind of resource. This is used to determine how to handle the resource.
- `class`: A class that will be instantiated with the config.
- `object`: An object that will be used as is.
- `instance`: An instance of a class that will be used as is.

***

### type?

```ts
optional type: AnyClass;
```
