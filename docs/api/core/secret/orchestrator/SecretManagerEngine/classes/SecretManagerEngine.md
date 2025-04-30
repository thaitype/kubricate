[Documentation](../../../../index.md) / [secret/orchestrator/SecretManagerEngine](../index.md) / SecretManagerEngine

# Class: SecretManagerEngine

SecretManagerEngine orchestrates loading, validating, and preparing secrets
across all stacks defined in the Kubricate config.

## Constructors

### Constructor

```ts
new SecretManagerEngine(options): SecretManagerEngine;
```

#### Parameters

##### options

[`SecretsOrchestratorOptions`](../../types/interfaces/SecretsOrchestratorOptions.md)

#### Returns

`SecretManagerEngine`

## Properties

### options

```ts
readonly options: SecretsOrchestratorOptions;
```

## Methods

### collect()

```ts
collect(): MergedSecretManager;
```

Collect all SecretManager instances from the project config.

#### Returns

[`MergedSecretManager`](../interfaces/MergedSecretManager.md)

#### Throws

If both `manager` and `registry` are defined simultaneously.

***

### loadSecrets()

```ts
loadSecrets(secretManager, secrets): Promise<Record<string, SecretValue>>;
```

Load secrets from connectors, optionally returning the loaded values.
If `returnValues` is false, this acts as a validation-only step.

#### Parameters

##### secretManager

[`SecretManager`](../../../SecretManager/classes/SecretManager.md)

##### secrets

`Record`\<`string`, [`SecretOptions`](../../../SecretManager/interfaces/SecretOptions.md)\<`string`, [`AnyKey`](../../../../types/type-aliases/AnyKey.md), [`AnyKey`](../../../../types/type-aliases/AnyKey.md)\>\>

#### Returns

`Promise`\<`Record`\<`string`, [`SecretValue`](../../../types/type-aliases/SecretValue.md)\>\>

***

### prepareEffects()

```ts
prepareEffects(managers): Promise<PreparedEffect[]>;
```

Prepare all effects (from providers) based on loaded secret values

#### Parameters

##### managers

[`MergedSecretManager`](../interfaces/MergedSecretManager.md)

#### Returns

`Promise`\<[`PreparedEffect`](../../../providers/BaseProvider/type-aliases/PreparedEffect.md)[]\>

***

### validate()

```ts
validate(managers): Promise<void>;
```

Validate all connectors by attempting to load secrets and resolve their values.
Will throw if any secret can't be loaded.

#### Parameters

##### managers

[`MergedSecretManager`](../interfaces/MergedSecretManager.md)

#### Returns

`Promise`\<`void`\>
