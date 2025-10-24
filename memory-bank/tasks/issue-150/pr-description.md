# Type-Safe Key Field for Environment Injection Strategy

## Summary

This PR introduces **type-safe environment key support** for secret injection strategies in Kubricate. The enhancement allows providers to declare specific keys (e.g., `username`, `password`) that are available for the `env` injection strategy, providing IDE autocomplete and compile-time type checking when using the `secrets().inject('env', { key: '...' })` API.

**Key Improvements:**
- Providers can now specify supported environment keys via a third generic type parameter
- The `SecretsInjectionContext.secrets()` method automatically infers available keys from the provider
- Type-safe autocomplete for the `key` field in `env` injection strategies
- Comprehensive documentation and examples added throughout the codebase

**Scope:** +410 additions, -68 deletions across 5 core files

---

## Motivation

Prior to this change, the `key` field in the `env` injection strategy was typed as `string | undefined`, which meant:

1. **No autocomplete support** - Developers had to manually reference documentation to know which keys were available (e.g., `username` and `password` for BasicAuthSecretProvider)
2. **No compile-time safety** - Typos in key names would only be caught at runtime
3. **Poor developer experience** - The type system wasn't leveraging provider-specific knowledge about available keys

This was particularly problematic for structured secret providers like `BasicAuthSecretProvider`, which have well-defined keys mandated by Kubernetes (e.g., the `kubernetes.io/basic-auth` Secret type requires `username` and `password` keys).

---

## Changes Made

### 1. Type System Enhancements

#### `BaseProvider` Interface (`@kubricate/core`)

Added a third generic type parameter `SupportedEnvKeys` to the `BaseProvider` interface:

```typescript
export interface BaseProvider<
  Config extends object = object,
  SupportedStrategies extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind'],
  SupportedEnvKeys extends string = string,  // NEW
>
```

Added `supportedEnvKeys` field to declare available environment keys:

```typescript
/**
 * Optional list of keys available for the 'env' injection strategy.
 * These keys define what fields can be injected when using the 'env' strategy kind.
 * For example, a BasicAuthSecretProvider might support 'username' and 'password' keys.
 *
 * @example ['username', 'password']
 */
readonly supportedEnvKeys?: SupportedEnvKeys[];
```

#### `SecretInjectionStrategy` Type (`@kubricate/core`)

Refactored the `SecretInjectionStrategy` discriminated union to use dedicated interfaces:

**Before:**
```typescript
export type SecretInjectionStrategy =
  | ({ kind: 'env'; containerIndex?: number; key?: string } & BaseSecretInjectionStrategy)
  | // ... other strategies
```

**After:**
```typescript
export interface EnvInjectionStrategy<Key extends string = string> extends BaseSecretInjectionStrategy {
  kind: 'env';
  containerIndex?: number;
  key?: Key;  // Now generic!
}

export type SecretInjectionStrategy<Key extends string = string> =
  | EnvInjectionStrategy<Key>
  | VolumeInjectionStrategy
  | AnnotationInjectionStrategy
  | ImagePullSecretInjectionStrategy
  | EnvFromInjectionStrategy
  | PluginInjectionStrategy;
```

Each strategy kind now has a dedicated interface with comprehensive JSDoc comments and examples.

### 2. API Changes

#### `SecretsInjectionContext` (`kubricate`)

Added comprehensive type inference utilities:

```typescript
/**
 * Infers the provider key (name) that a given secret is configured to use.
 */
export type InferSecretProviderKey<
  SM extends AnySecretManager,
  Key extends keyof ExtractSecretManager<SM>['secretEntries'],
> = ExtractSecretManager<SM>['secretEntries'][Key] extends { provider: infer P } ? P : never;

/**
 * Extracts the supported injection strategies from a provider instance.
 */
export type ExtractProviderStrategies<SM extends AnySecretManager, ProviderKey> = /* ... */;

/**
 * Infers the available injection strategies for a given secret.
 */
export type InferSecretStrategies<
  SM extends AnySecretManager,
  Key extends keyof ExtractSecretManager<SM>['secretEntries'],
> = ExtractProviderStrategies<SM, InferSecretProviderKey<SM, Key>>;

/**
 * Extracts the supported environment keys from a provider instance.
 */
export type ExtractProviderEnvKeys<SM extends AnySecretManager, ProviderKey> = /* ... */;

/**
 * Infers the available environment keys for a given secret.
 */
export type InferSecretEnvKeys<
  SM extends AnySecretManager,
  Key extends keyof ExtractSecretManager<SM>['secretEntries'],
> = ExtractProviderEnvKeys<SM, InferSecretProviderKey<SM, Key>>;
```

Enhanced the `secrets()` method signature with inferred types:

```typescript
secrets<
  NewKey extends keyof ExtractSecretManager<SM>['secretEntries'],
  ProviderKinds extends InferSecretStrategies<SM, NewKey>,
  ProviderEnvKeys extends InferSecretEnvKeys<SM, NewKey>,  // NEW
>(secretName: NewKey): SecretInjectionBuilder<ProviderKinds, ProviderEnvKeys>
```

#### `SecretInjectionBuilder` (`kubricate`)

Updated to accept and use the inferred environment keys:

```typescript
export class SecretInjectionBuilder<
  Kinds extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind'],
  EnvKey extends string = string,  // NEW
>
```

Updated the `inject()` method signature:

```typescript
inject<K extends Kinds>(kind: K, strategyOptions?: StrategyOptionsForKind<K, EnvKey>): this;
```

### 3. Provider Implementations

#### `BasicAuthSecretProvider` (`@kubricate/plugin-kubernetes`)

Updated to declare supported environment keys:

```typescript
type SupportedStrategies = 'env' | 'envFrom';
type SupportedEnvKeys = 'username' | 'password';  // NEW

export class BasicAuthSecretProvider
  implements BaseProvider<BasicAuthSecretProviderConfig, SupportedStrategies, SupportedEnvKeys>
{
  readonly supportedStrategies: SupportedStrategies[] = ['env', 'envFrom'];
  readonly supportedEnvKeys: SupportedEnvKeys[] = ['username', 'password'];  // NEW
  // ...
}
```

### 4. Documentation Improvements

Added comprehensive JSDoc comments throughout:

- **`BaseProvider` interface** - Detailed documentation for each field and method with examples
- **`SecretInjectionStrategy` types** - Each strategy interface now has examples and clear descriptions
- **`SecretsInjectionContext`** - Extensive documentation of type inference utilities and the `secrets()` method
- **Type utilities** - All helper types now include examples showing input and output

### 5. Code Organization

Refactored type naming for clarity and consistency:

**Before:**
```typescript
GetProviderKindFromConnector
GetProviderKinds
ExtractProviderKeyFromSecretManager
```

**After:**
```typescript
ExtractProviderStrategies
InferSecretStrategies
InferSecretProviderKey
ExtractProviderEnvKeys
InferSecretEnvKeys
```

The new naming convention:
- `Extract*` - Low-level utilities that work directly with provider keys
- `Infer*` - High-level utilities that combine secret lookup with extraction

---

## Breaking Changes

**None.** This is a backward-compatible enhancement.

- The third type parameter on `BaseProvider` defaults to `string`, maintaining existing behavior
- The `supportedEnvKeys` field is optional
- Existing code without explicit key types continues to work as before
- The `key` field in `EnvInjectionStrategy` remains optional

---

## Examples

### Basic Usage with Type Safety

```typescript
import { SecretManager } from 'kubricate';
import { BasicAuthSecretProvider } from '@kubricate/plugin-kubernetes';
import { EnvConnector } from '@kubricate/plugin-env';

const secretManager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('basicAuth', new BasicAuthSecretProvider({
    name: 'my-basic-auth',
    namespace: 'default'
  }))
  .addSecret({
    name: 'databaseCredentials',
    provider: 'basicAuth'
  });

// In your stack:
stack.useSecrets(secretManager, (injector) => {
  injector.setDefaultResourceId('my-deployment');

  // ✅ Type-safe: IDE autocompletes 'username' | 'password'
  injector.secrets('databaseCredentials')
    .inject('env', { key: 'username' });

  injector.secrets('databaseCredentials')
    .inject('env', { key: 'password' });

  // ❌ Type error: 'invalidKey' is not assignable to 'username' | 'password'
  // injector.secrets('databaseCredentials')
  //   .inject('env', { key: 'invalidKey' });
});
```

### Auto-Detection Without Key

```typescript
// When provider supports only one strategy, kind can be omitted
injector.secrets('dockerRegistry')
  .inject(); // Automatically uses 'imagePullSecret'

// When using envFrom, all keys are injected together
injector.secrets('databaseCredentials')
  .inject('envFrom', { prefix: 'DB_' });
// Results in: DB_username, DB_password
```

### Custom Provider with Specific Keys

```typescript
type MyKeys = 'apiKey' | 'apiSecret' | 'region';

class CustomApiProvider implements BaseProvider<
  CustomConfig,
  'env' | 'volume',
  MyKeys  // Type-safe keys!
> {
  readonly supportedStrategies = ['env', 'volume'] as const;
  readonly supportedEnvKeys = ['apiKey', 'apiSecret', 'region'] as const;
  // ...
}

// Usage with autocomplete
injector.secrets('apiCredentials')
  .inject('env', { key: 'apiKey' });      // ✅ autocomplete works
  .inject('env', { key: 'apiSecret' });   // ✅ autocomplete works
  .inject('env', { key: 'region' });      // ✅ autocomplete works
```

### Type Inference in Action

```typescript
// The type system infers everything from the SecretManager configuration:

const manager = new SecretManager()
  .addProvider('opaque', new OpaqueSecretProvider({ /* ... */ }))
  .addProvider('basicAuth', new BasicAuthSecretProvider({ /* ... */ }))
  .addSecret({
    name: 'password',      // Uses opaque provider (no specific keys)
    provider: 'opaque'
  })
  .addSecret({
    name: 'credentials',   // Uses basicAuth provider ('username' | 'password' keys)
    provider: 'basicAuth'
  });

stack.useSecrets(manager, (injector) => {
  // Type of 'password' builder: SecretInjectionBuilder<'env' | 'volume', string>
  injector.secrets('password')
    .inject('env', { key: 'any-string' }); // ✅ accepts any string

  // Type of 'credentials' builder: SecretInjectionBuilder<'env' | 'envFrom', 'username' | 'password'>
  injector.secrets('credentials')
    .inject('env', { key: 'username' }); // ✅ only 'username' | 'password'
});
```

---

## Testing

### Validation Performed

1. **Type Checking** - All TypeScript compilation passes without errors
2. **Backward Compatibility** - Existing examples and tests continue to work
3. **IDE Experience** - Verified autocomplete works correctly in VS Code
4. **Runtime Behavior** - No changes to runtime behavior, only type-level enhancements

### Test Cases Covered

- BasicAuthSecretProvider with explicit keys
- OpaqueSecretProvider without specific keys (remains generic)
- DockerConfigSecretProvider (no env keys, different strategy)
- Type inference through SecretManager configuration
- Mixed providers in single SecretManager

---

## Related Issues

- **PR #150** - This pull request
- Related to issue #75 (Hydration Plan support) - Improved type safety helps with future hydration features
- Related to issue #84 (Plugin injection strategy) - Consistent with type-safe strategy design

---

## Migration Guide

No migration required! This is a backward-compatible enhancement.

### For Existing Code

Existing code continues to work without changes:

```typescript
// Still works - key is optional and typed as string | undefined
injector.secrets('mySecret')
  .inject('env');
```

### For New Providers

To enable type-safe keys, add the third type parameter and `supportedEnvKeys` field:

```typescript
// Before
class MyProvider implements BaseProvider<MyConfig, 'env'> {
  readonly supportedStrategies = ['env'];
}

// After (with type-safe keys)
class MyProvider implements BaseProvider<MyConfig, 'env', 'key1' | 'key2'> {
  readonly supportedStrategies = ['env'];
  readonly supportedEnvKeys = ['key1', 'key2'];  // Add this
}
```

---

## Technical Notes

### Type Inference Flow

1. User calls `injector.secrets('secretName')`
2. `InferSecretProviderKey<SM, 'secretName'>` looks up which provider is configured
3. `ExtractProviderEnvKeys<SM, ProviderKey>` extracts the third type parameter from that provider
4. Result flows to `SecretInjectionBuilder<Kinds, EnvKeys>`
5. When calling `.inject('env', { key: ... })`, the `key` field is typed as `EnvKeys`

### Design Decisions

1. **Optional field** - Made `supportedEnvKeys` optional to maintain backward compatibility
2. **Generic default** - Default type parameter `string` allows providers without specific keys
3. **Separate interfaces** - Each strategy kind gets its own interface for clarity and extensibility
4. **Naming convention** - `Infer*` vs `Extract*` clarifies the abstraction level

### Performance Impact

**Zero runtime impact** - All changes are type-level only. No additional runtime checks or overhead.

---

## Future Work

This enhancement lays the groundwork for:

1. **Validation at apply time** - Could validate that specified keys exist in connector values
2. **Better error messages** - Can provide more specific errors when keys are missing
3. **Documentation generation** - Could auto-generate provider documentation from type definitions
4. **IDE extensions** - Could provide inline documentation for available keys

---

## Checklist

- [x] Type system enhancements implemented
- [x] All existing tests pass
- [x] Type inference working correctly
- [x] Documentation added/updated
- [x] Examples provided
- [x] Backward compatibility maintained
- [x] No breaking changes
- [x] Code formatted and linted
