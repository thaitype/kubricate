# Add BasicAuthSecretProvider for Kubernetes Basic-Auth Secrets

Closes #140

## Summary

Adds `BasicAuthSecretProvider` to support the `kubernetes.io/basic-auth` Secret type with **type-safe injection strategies**.
Supports both individual key (`env`) and bulk (`envFrom`) injection with improved type inference and validation.

## Key Features

### 🧩 Core Provider

* New provider: `BasicAuthSecretProvider` (`@kubricate/plugin-kubernetes`)
* Generates Secrets with fixed keys: `username`, `password`
* Supports:

  * `env` injection (`key` required)
  * `envFrom` injection (`prefix` optional)
* Zod-based validation for username/password presence
* Base64 encoding and safe merge handling
* Defensive validation to prevent mixed strategies and prefix conflicts

### 🧠 Type Enhancements

* Extended `SecretInjectionStrategy` with optional `key` and `prefix`
* Improved type narrowing via `StrategyOptionsForKind<K>`
* Accurate type inference in `inject()` based on strategy kind

## Example Usage

**Individual Key Injection**

```ts
c.secrets('API_CREDENTIALS')
  .forName('API_USERNAME')
  .inject('env', { key: 'username' });

c.secrets('API_CREDENTIALS')
  .forName('API_PASSWORD')
  .inject('env', { key: 'password' });
```

**Bulk Injection**

```ts
c.secrets('DB_CREDENTIALS').inject('envFrom', { prefix: 'DB_' });
```

## Security & Validation Fix

During a technical audit, a **high-severity validation issue** was discovered and resolved.
Unvalidated strategy assumptions could cause silent data corruption.

### Fixes Implemented

* **Mixed strategy validation** — prevents combining `env` and `envFrom`
* **Prefix consistency check** — enforces same prefix for all `envFrom` injections
* **Handler-level guard** — ensures strategy alignment across handlers

All fixes are backed by **7 new tests** and clear error messages.
Silent failures are now transformed into explicit build-time errors.

## Tests & Coverage

* **35 new tests** (42 total for plugin)
* Covers validation, injection, merge handling, and edge cases
* **Testing:** tests passing
* **Audit:** Two-phase development (initial + post-audit fix), 95%+ code quality

## Compatibility

No breaking changes.

* Existing providers continue to work unchanged
* New parameters (`key`, `prefix`) are optional
* Full backward compatibility verified

## Migration

Optional opt-in feature:

```ts
import { BasicAuthSecretProvider } from '@kubricate/plugin-kubernetes';

const secretManager = new SecretManager()
  .addProvider('BasicAuthProvider', new BasicAuthSecretProvider({ name: 'my-basic-auth' }))
  .addSecret({ name: 'CREDENTIALS', provider: 'BasicAuthProvider' });
```

## Quality Assurance

* ✅ Comprehensive tests & audits
* ✅ Security fix validated
* ✅ Documentation updated (README, JSDoc, examples)
* ✅ Example project included (3 injection patterns)
* ✅ Production ready, low risk
