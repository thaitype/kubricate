[Documentation](../../../../index.md) / [secret/providers/BaseProvider](../index.md) / ProviderInjection

# Interface: ProviderInjection\<ResourceId, Path\>

## Type Parameters

### ResourceId

`ResourceId` *extends* `string` = `string`

### Path

`Path` *extends* `string` = `string`

## Properties

### meta?

```ts
optional meta: object;
```

Extra metadata passed during injection.

#### secretName

```ts
secretName: string;
```

#### targetName

```ts
targetName: string;
```

***

### path

```ts
path: Path;
```

Target path in the resource where the secret will be injected.
This is used to deep-merge the value into the resource.
Refer to lodash get (Gets the value at path of object.) for more details.
https://lodash.com/docs/4.17.15#get

This is a dot-separated path to the property in the resource where the value should be applied.

***

### provider

```ts
provider: BaseProvider;
```

Provider Instance use for get injectionPayload

***

### providerId

```ts
providerId: string;
```

A stable identifier for the provider instance.

***

### resourceId

```ts
resourceId: ResourceId;
```

Target resource ID in the composer which the secret will be injected.
