[Documentation](../../index.md) / [resource-allocator](../index.md) / ResourceAllocator

# Class: ResourceAllocator

A class that calculates Kubernetes resource requests and limits based on predefined allocation strategies.

## Default

preset, `conservative`

## Constructors

### Constructor

```ts
new ResourceAllocator(preset): ResourceAllocator;
```

Initializes the ResourceAllocator with a preset allocation mode.

#### Parameters

##### preset

[`PresetType`](../type-aliases/PresetType.md) = `'conservative'`

The resource allocation strategy (`conservative`, `optimized`, or `aggressive`).

#### Returns

`ResourceAllocator`

## Methods

### computeResources()

```ts
computeResources(input): ComputedResources;
```

Computes the resource requests and limits based on the selected preset.

#### Parameters

##### input

`ResourceConfig`

The input CPU (in cores) and memory (in GiB).

#### Returns

`ComputedResources`

An object containing `requests` and `limits` in Kubernetes format.
