[Documentation](../index.md) / resource-allocator

# resource-allocator

## Classes

| Class | Description |
| ------ | ------ |
| [ResourceAllocator](classes/ResourceAllocator.md) | A class that calculates Kubernetes resource requests and limits based on predefined allocation strategies. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [PresetType](type-aliases/PresetType.md) | Preset modes for resource allocation. - `conservative`: Prioritizes stability and efficiency with lower `requests` and limited `limits`. - `optimized`: A balanced approach that optimizes resource usage without overcommitting. - `aggressive`: Maximizes performance by using all allocated resources with high limits. |
