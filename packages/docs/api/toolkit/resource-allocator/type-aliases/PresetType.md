[Documentation](../../index.md) / [resource-allocator](../index.md) / PresetType

# Type Alias: PresetType

```ts
type PresetType = "conservative" | "optimized" | "aggressive";
```

Preset modes for resource allocation.
- `conservative`: Prioritizes stability and efficiency with lower `requests` and limited `limits`.
- `optimized`: A balanced approach that optimizes resource usage without overcommitting.
- `aggressive`: Maximizes performance by using all allocated resources with high limits.
