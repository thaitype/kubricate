[Documentation](../../../index.md) / [secret/SecretRegistry](../index.md) / SecretRegistry

# Class: SecretRegistry\<SecretManagerStore\>

SecretRegistry

## Description

Central registry to globally manage all declared SecretManager instances within a project.

- Provides a single authoritative map of all available SecretManagers.
- Allows consistent conflict resolution across the entire project (not per-stack).
- Decouples SecretManager lifecycle from consumer frameworks (e.g., Stacks in Kubricate).
- Enables flexible, multi-environment setups (e.g., staging, production, DR plans).

## Remarks

- **Conflict detection** during secret orchestration (apply/plan) operates *only* at the registry level.
- **Stacks** or **consumers** simply reference SecretManagers; they are not responsible for conflict handling.
- Synthing and Kubricate treat the registry as the **single source of truth** for all secret orchestration workflows.

---

# Example

```ts
const registry = new SecretRegistry()
  .register('frontend', frontendManager)
  .register('backend', backendManager);

const manager = registry.get('frontend');
```

## Type Parameters

### SecretManagerStore

`SecretManagerStore` *extends* `Record`\<`string`, [`AnySecretManager`](../../types/type-aliases/AnySecretManager.md)\> = \{
\}

## Constructors

### Constructor

```ts
new SecretRegistry<SecretManagerStore>(): SecretRegistry<SecretManagerStore>;
```

#### Returns

`SecretRegistry`\<`SecretManagerStore`\>

## Methods

### add()

```ts
add<Name, NewSecretManager>(name, manager): SecretRegistry<SecretManagerStore & Record<Name, NewSecretManager>>;
```

Register a named SecretManager into the registry.

#### Type Parameters

##### Name

`Name` *extends* `string`

##### NewSecretManager

`NewSecretManager` *extends* [`AnySecretManager`](../../types/type-aliases/AnySecretManager.md)

#### Parameters

##### name

`Name`

Unique name for the secret manager.

##### manager

`NewSecretManager`

SecretManager instance to register.

#### Returns

`SecretRegistry`\<`SecretManagerStore` & `Record`\<`Name`, `NewSecretManager`\>\>

for chaining

#### Throws

if a duplicate name is registered

***

### get()

```ts
get<Name>(name): SecretManagerStore[Name];
```

Retrieve a SecretManager by its registered name.

#### Type Parameters

##### Name

`Name` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### name

`Name`

The name of the secret manager.

#### Returns

`SecretManagerStore`\[`Name`\]

#### Throws

if the name is not found

***

### list()

```ts
list(): Record<string, AnySecretManager>;
```

Return all registered secret managers as an object.

Used internally by the orchestrator.

#### Returns

`Record`\<`string`, [`AnySecretManager`](../../types/type-aliases/AnySecretManager.md)\>
