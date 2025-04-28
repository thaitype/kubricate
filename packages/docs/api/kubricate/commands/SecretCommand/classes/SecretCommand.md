[Documentation](../../../index.md) / [commands/SecretCommand](../index.md) / SecretCommand

# Class: SecretCommand

## Constructors

### Constructor

```ts
new SecretCommand(
   options, 
   logger, 
   kubectl): SecretCommand;
```

#### Parameters

##### options

[`GlobalConfigOptions`](../../../internal/types/interfaces/GlobalConfigOptions.md)

##### logger

`BaseLogger`

##### kubectl

[`KubectlExecutor`](../../../executor/kubectl-executor/classes/KubectlExecutor.md)

#### Returns

`SecretCommand`

## Properties

### kubectl

```ts
protected kubectl: KubectlExecutor;
```

***

### logger

```ts
protected logger: BaseLogger;
```

***

### options

```ts
protected options: GlobalConfigOptions;
```

## Methods

### apply()

```ts
apply(orchestrator): Promise<void>;
```

#### Parameters

##### orchestrator

`SecretsOrchestrator`

#### Returns

`Promise`\<`void`\>

***

### validate()

```ts
validate(orchestrator): Promise<void>;
```

#### Parameters

##### orchestrator

`SecretsOrchestrator`

#### Returns

`Promise`\<`void`\>
