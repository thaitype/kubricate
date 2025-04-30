[Documentation](../../../../index.md) / [secret/orchestrator/SecretsOrchestrator](../index.md) / SecretsOrchestrator

# Class: SecretsOrchestrator

SecretsOrchestrator

## Description

Central orchestration engine responsible for:
- Validating secret configuration and managers
- Loading and resolving all declared secrets
- Preparing provider-specific effects
- Applying conflict resolution strategies (intraProvider, crossProvider, crossManager)
- Producing a fully merged, finalized list of secret effects ready for output (e.g., YAML, JSON, etc.)

## Remarks

- Acts as the internal core behind `kubricate secret apply`.
- Ensures predictable, auditable, and conflict-safe secret generation.
- Delegates provider-specific behavior to registered providers (e.g., mergeSecrets, prepare).

## Usage

Typically called via:

```ts
const orchestrator = SecretsOrchestrator.create(options);
const effects = await orchestrator.apply();
```

## Throws

If configuration, validation, or merging fails at any stage.

## Constructors

### Constructor

```ts
new SecretsOrchestrator(engine, logger): SecretsOrchestrator;
```

#### Parameters

##### engine

[`SecretManagerEngine`](../../SecretManagerEngine/classes/SecretManagerEngine.md)

##### logger

[`BaseLogger`](../../../../types/interfaces/BaseLogger.md)

#### Returns

`SecretsOrchestrator`

## Methods

### apply()

```ts
apply(): Promise<PreparedEffect[]>;
```

Prepares a fully validated and merged set of provider-ready secret effects.

#### Returns

`Promise`\<[`PreparedEffect`](../../../providers/BaseProvider/type-aliases/PreparedEffect.md)[]\>

A list of finalized secret effects ready for output (e.g., Kubernetes manifests).

#### Remarks

This is the core orchestration method called by commands like `kubricate secret apply`.

#### Description

Executes the full secret orchestration lifecycle:
- Validates project configuration and all secret managers
- Loads and resolves all secrets across managers
- Prepares raw provider effects for each secret
- Merges effects according to conflict strategies (intraProvider, crossProvider, etc.)

Logs context and important processing steps for debugging and traceability.

#### Throws

- If configuration validation fails (e.g., strictConflictMode violations).
- If loading or preparing secrets fails.
- If conflict resolution encounters an unrecoverable error (based on config).

***

### validate()

```ts
validate(): Promise<MergedSecretManager>;
```

Validates the project configuration and all registered secret managers.

#### Returns

`Promise`\<[`MergedSecretManager`](../../SecretManagerEngine/interfaces/MergedSecretManager.md)\>

A fully validated set of collected secret managers.

#### Remarks

This is automatically called by commands like `kubricate secret apply` and `kubricate secret validate`.

#### Description

Performs full validation across:
- Configuration schema (e.g., strictConflictMode rules, secret manager presence)
- SecretManager instances and their attached connectors
- Ensures all declared secrets can be loaded without error

Logs important validation steps for traceability.

#### Throws

- If a configuration violation is detected (e.g., invalid strictConflictMode usage).
- If a SecretManager or connector fails to validate or load secrets.

***

### create()

```ts
static create(options): SecretsOrchestrator;
```

Factory method to create a SecretsOrchestrator instance from options.

#### Parameters

##### options

[`SecretsOrchestratorOptions`](../../types/interfaces/SecretsOrchestratorOptions.md)

#### Returns

`SecretsOrchestrator`
