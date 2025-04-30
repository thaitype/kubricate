[Documentation](../../index.md) / [resource-metadata](../index.md) / createMetadata

# Function: createMetadata()

```ts
function createMetadata(namespace): (name, suffix, metadata?) => object;
```

Factory function to create metadata for resources.

## Parameters

### namespace

`"default"` | [`AnyString`](../../types/type-aliases/AnyString.md)

## Returns

```ts
(
   name, 
   suffix, 
   metadata?): object;
```

### Parameters

#### name

`string`

#### suffix

`"secret"` | `"namespace"` | `"deployment"` | `"service"` | `"pod"` | `"job"` | `"role"` | `"operator"` | `"configMap"` | `"persistentVolume"` | `"persistentVolumeClaim"` | `"statefulSet"` | `"daemonSet"` | `"replicaSet"` | `"cronJob"` | `"ingress"` | `"networkPolicy"` | `"httpProxy"` | `"certificate"` | `"clusterIssuer"` | `"roleBinding"` | `"clusterRole"` | `"clusterRoleBinding"` | `"serviceAccount"` | `"storageClass"` | `"volumeSnapshot"` | `"customResourceDefinition"`

#### metadata?

`Record`\<`string`, `unknown`\>

### Returns

`object`

#### name

```ts
name: string;
```

#### namespace

```ts
namespace: string = resolvedNamespace;
```
