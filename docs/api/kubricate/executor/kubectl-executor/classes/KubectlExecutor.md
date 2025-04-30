[Documentation](../../../index.md) / [executor/kubectl-executor](../index.md) / KubectlExecutor

# Class: KubectlExecutor

## Constructors

### Constructor

```ts
new KubectlExecutor(
   kubectlPath, 
   logger, 
   execa): KubectlExecutor;
```

#### Parameters

##### kubectlPath

`string`

##### logger

`BaseLogger`

##### execa

[`ExecaExecutor`](../../execa-executor/classes/ExecaExecutor.md)

#### Returns

`KubectlExecutor`

## Methods

### apply()

```ts
apply(resource): Promise<void>;
```

#### Parameters

##### resource

`object`

#### Returns

`Promise`\<`void`\>
