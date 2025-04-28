[Documentation](../../index.md) / [ResourceComposer](../index.md) / ResourceComposer

# Class: ResourceComposer\<Entries\>

## Type Parameters

### Entries

`Entries` *extends* `Record`\<`string`, `unknown`\> = \{
\}

## Constructors

### Constructor

```ts
new ResourceComposer<Entries>(): ResourceComposer<Entries>;
```

#### Returns

`ResourceComposer`\<`Entries`\>

## Properties

### \_entries

```ts
_entries: Record<string, ResourceEntry> = {};
```

***

### \_override

```ts
_override: Record<string, unknown> = {};
```

## Methods

### ~~add()~~

```ts
add<Id, T>(params): ResourceComposer<Entries & Record<Id, ConstructorParameters<T>[0]>>;
```

Add a resource to the composer, extracting the type and data from the arguments.

#### Type Parameters

##### Id

`Id` *extends* `string`

##### T

`T` *extends* [`AnyClass`](../../types/type-aliases/AnyClass.md)

#### Parameters

##### params

###### config

`ConstructorParameters`\<`T`\>\[`0`\]

###### id

`Id`

###### type

`T`

#### Returns

`ResourceComposer`\<`Entries` & `Record`\<`Id`, `ConstructorParameters`\<`T`\>\[`0`\]\>\>

#### Deprecated

This method is deprecated and will be removed in the future. Use `addClass` instead.

***

### addClass()

```ts
addClass<Id, T>(params): ResourceComposer<Entries & Record<Id, ConstructorParameters<T>[0]>>;
```

Add a resource to the composer, extracting the type and data from the arguments.

#### Type Parameters

##### Id

`Id` *extends* `string`

##### T

`T` *extends* [`AnyClass`](../../types/type-aliases/AnyClass.md)

#### Parameters

##### params

###### config

`ConstructorParameters`\<`T`\>\[`0`\]

###### id

`Id`

###### type

`T`

#### Returns

`ResourceComposer`\<`Entries` & `Record`\<`Id`, `ConstructorParameters`\<`T`\>\[`0`\]\>\>

***

### ~~addInstance()~~

```ts
addInstance<Id, T>(params): ResourceComposer<Entries & Record<Id, T>>;
```

Add an instance to the composer directly. Using this method will not support overriding the resource.

#### Type Parameters

##### Id

`Id` *extends* `string`

##### T

`T` *extends* `object` = `object`

#### Parameters

##### params

###### config

`T`

###### id

`Id`

#### Returns

`ResourceComposer`\<`Entries` & `Record`\<`Id`, `T`\>\>

#### Deprecated

This method is deprecated and will be removed in the future. Use `addObject` instead for supporting overrides.

***

### addObject()

```ts
addObject<Id, T>(params): ResourceComposer<Entries & Record<Id, T>>;
```

Add an object to the composer directly. Using this method will support overriding the resource.

#### Type Parameters

##### Id

`Id` *extends* `string`

##### T

`T` *extends* `object` = `object`

#### Parameters

##### params

###### config

`T`

###### id

`Id`

#### Returns

`ResourceComposer`\<`Entries` & `Record`\<`Id`, `T`\>\>

***

### build()

```ts
build(): Record<string, unknown>;
```

#### Returns

`Record`\<`string`, `unknown`\>

***

### findResourceIdsByKind()

```ts
findResourceIdsByKind(kind): string[];
```

#### Parameters

##### kind

`string`

#### Returns

`string`[]

#### Interal

Find all resource IDs of a specific kind.
This method is useful for filtering resources based on their kind.

***

### inject()

```ts
inject(
   resourceId, 
   path, 
   value): void;
```

#### Parameters

##### resourceId

`string`

##### path

`string`

##### value

`unknown`

#### Returns

`void`

***

### override()

```ts
override(overrideResources): ResourceComposer<Entries>;
```

#### Parameters

##### overrideResources

`Equal`\<`Entries`, *typeof* `_`\> *extends* `true` ? \[\] : \[`Entries`\] *extends* `args` ? `args` : `never` *extends* \[`pipedFirst`, `...pipedRest[]`\] ? \[`pipedFirst`, `...pipedRest[]`\] : \[\] *extends* `args` ? `args` *extends* `args` ? `args` : `never` *extends* \[`obj`\] ? `TransformObjectDeep`\<`PartialFn`, `obj`\> : `never` : `never`

#### Returns

`ResourceComposer`\<`Entries`\>
