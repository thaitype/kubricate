# Introduction

This requirement document outlines the implementation of `TlsSecretProvider` for Kubricate, a new provider that generates Kubernetes Secrets of type `kubernetes.io/tls` for managing TLS certificates and private keys.

The `TlsSecretProvider` follows the established patterns from `BasicAuthSecretProvider` and `DockerConfigSecretProvider`, providing type-safe secret management with support for `env` and `envFrom` injection strategies.

# **Glossary**

- **TlsSecretProvider**: A provider class that converts PEM-encoded TLS certificates and keys into Kubernetes `kubernetes.io/tls` type secrets
- **PEM (Privacy Enhanced Mail)**: Base64-encoded certificate and key format wrapped in BEGIN/END markers
- **kubernetes.io/tls**: Standard Kubernetes secret type for TLS certificates, containing `tls.crt` and `tls.key` keys
- **env injection**: Strategy to inject individual secret keys as environment variables
- **envFrom injection**: Strategy to inject all secret keys at once with optional prefix
- **Effect merging**: Combining multiple secret effects targeting the same namespace/name
- **Strategy homogeneity**: Requirement that all injections for a secret use the same strategy type

# Requirement

## Functional Requirement

1. **Secret Type Generation**
   - Generate Kubernetes Secrets with type `kubernetes.io/tls`
   - Accept PEM-encoded certificate (`cert`) and private key (`key`) as input
   - Base64-encode certificate to `tls.crt` key
   - Base64-encode private key to `tls.key` key
   - Support namespace specification (default: "default")

2. **Input Validation**
   - Validate input schema using Zod
   - Require non-empty `cert` string (PEM-encoded certificate)
   - Require non-empty `key` string (PEM-encoded private key)
   - Throw descriptive errors for missing or invalid fields

3. **Injection Strategies**
   - Support `env` strategy for injecting individual keys (`tls.crt` or `tls.key`)
   - Support `envFrom` strategy for injecting all keys at once
   - Enforce strategy homogeneity (all injections must use same strategy)
   - Support custom container index targeting (default: 0)
   - Support custom targetPath overrides

4. **env Strategy Behavior**
   - Require `meta.strategy.key` to be either `'tls.crt'` or `'tls.key'`
   - Require `meta.targetName` (environment variable name)
   - Generate `EnvVar[]` with `secretKeyRef` references
   - Allow multiple env injections for different keys

5. **envFrom Strategy Behavior**
   - Support optional prefix for all environment variables
   - Validate prefix consistency across all injections
   - Generate single `EnvFromSource` with `secretRef`
   - Deduplicate multiple envFrom injections

6. **Effect Merging**
   - Support merging multiple effects for the same `(namespace, name)` tuple
   - Merge `.data` objects from multiple effects
   - Detect and throw errors on duplicate keys with conflicting values
   - Use `createKubernetesMergeHandler()` utility

7. **Error Handling**
   - Provide clear, actionable error messages
   - List all found strategy kinds when mixed strategies detected
   - Include "(none)" in prefix lists when undefined prefix present
   - Throw on unsupported strategy kinds
   - Throw on missing required metadata

## Non-Functional Requirement

1. **Code Quality**
   - Follow existing provider patterns from `BasicAuthSecretProvider`
   - Maintain consistent error messaging style
   - Use TypeScript strict mode
   - Include comprehensive JSDoc comments

2. **Type Safety**
   - Implement `BaseProvider<TlsSecretProviderConfig, SupportedStrategies>`
   - Define strict TypeScript interfaces for all configurations
   - Use Zod schema for runtime validation
   - Provide proper type exports

3. **Testing Coverage**
   - Achieve parity with `BasicAuthSecretProvider` test coverage
   - Include unit tests for all public methods
   - Test both success and error paths
   - Use Vitest framework
   - Include edge cases and validation scenarios

4. **Performance**
   - Minimize redundant base64 encoding operations
   - Efficient deduplication of envFrom injections
   - Optimize merge operations for large secret sets

5. **Maintainability**
   - Reuse existing utilities (`parseZodSchema`, `createKubernetesMergeHandler`)
   - Follow DRY principles
   - Keep method complexity low
   - Document public API clearly

# Diagram/User Interface

```
┌─────────────────────────────────────────────────────────────┐
│                    TlsSecretProvider                        │
├─────────────────────────────────────────────────────────────┤
│ Config:                                                     │
│   - name: string                                            │
│   - namespace?: string                                      │
├─────────────────────────────────────────────────────────────┤
│ Input (prepare):                                            │
│   { cert: string (PEM), key: string (PEM) }                 │
│                           ↓                                 │
│   Validation (tlsSecretSchema)                              │
│                           ↓                                 │
│   Base64 Encoding                                           │
│                           ↓                                 │
│   kubectl Effect:                                           │
│   apiVersion: v1                                            │
│   kind: Secret                                              │
│   type: kubernetes.io/tls                                   │
│   data:                                                     │
│     tls.crt: <base64(cert)>                                 │
│     tls.key: <base64(key)>                                  │
├─────────────────────────────────────────────────────────────┤
│ Injection (getInjectionPayload):                            │
│                                                             │
│ env strategy:                                               │
│   [{ name: TLS_CERT,                                        │
│      valueFrom: { secretKeyRef: { key: 'tls.crt' } } }]     │
│                                                             │
│ envFrom strategy:                                           │
│   [{ prefix: 'TLS_',                                        │
│      secretRef: { name: 'ingress-tls' } }]                  │
└─────────────────────────────────────────────────────────────┘
```

**Usage Flow:**
```
User Code
  ↓
TlsSecretProvider.prepare(name, {cert, key})
  ↓
Validation & Base64 Encoding
  ↓
PreparedEffect[] (kubectl Secret)
  ↓
Stack.useSecrets() → Injection
  ↓
TlsSecretProvider.getInjectionPayload(injections)
  ↓
EnvVar[] or EnvFromSource[]
  ↓
Merged into Deployment manifest
```

# Acceptance Criteria

1. **Secret Generation**
   - [ ] Creates Kubernetes Secret with type `kubernetes.io/tls`
   - [ ] Correctly base64-encodes cert to `tls.crt`
   - [ ] Correctly base64-encodes key to `tls.key`
   - [ ] Defaults namespace to "default" when not specified
   - [ ] Throws validation error when `cert` is missing or empty
   - [ ] Throws validation error when `key` is missing or empty

2. **env Strategy Injection**
   - [ ] Injects `tls.crt` as environment variable when `key: 'tls.crt'` specified
   - [ ] Injects `tls.key` as environment variable when `key: 'tls.key'` specified
   - [ ] Supports injecting both keys as separate environment variables
   - [ ] Throws error when `key` not specified in env strategy
   - [ ] Throws error when `key` is not `'tls.crt'` or `'tls.key'`
   - [ ] Throws error when `targetName` is missing or empty

3. **envFrom Strategy Injection**
   - [ ] Injects entire secret without prefix when prefix not specified
   - [ ] Respects prefix when specified (e.g., `TLS_`)
   - [ ] Validates all prefixes are identical across injections
   - [ ] Throws error listing conflicting prefixes when different
   - [ ] Throws error when mixing prefixed and non-prefixed injections
   - [ ] Returns single deduplicated `EnvFromSource`

4. **Target Path Resolution**
   - [ ] Returns `spec.template.spec.containers[0].env` for env strategy with default index
   - [ ] Returns correct path with custom container index for env strategy
   - [ ] Returns `spec.template.spec.containers[0].envFrom` for envFrom strategy with default index
   - [ ] Returns correct path with custom container index for envFrom strategy
   - [ ] Respects custom `targetPath` override when provided
   - [ ] Throws error for unsupported strategy kinds

5. **Effect Merging**
   - [ ] Merges multiple effects for same `(namespace, name)` combination
   - [ ] Combines `.data` objects from multiple effects
   - [ ] Throws error on duplicate keys with different values
   - [ ] Returns single merged effect for duplicate targets

6. **Metadata & Configuration**
   - [ ] `supportedStrategies` contains exactly `['env', 'envFrom']`
   - [ ] `secretType` equals `'Kubernetes.Secret.Tls'`
   - [ ] `targetKind` equals `'Deployment'`
   - [ ] `allowMerge` equals `true`
   - [ ] `getEffectIdentifier()` returns `"<namespace>/<name>"` format
   - [ ] Effect identifier defaults namespace to "default"

7. **Error Messages**
   - [ ] Mixed strategy error lists all found strategy kinds
   - [ ] Prefix conflict error lists all conflicting prefixes
   - [ ] Includes helpful hints about targetPath misconfiguration
   - [ ] Error messages match tone/style of `BasicAuthSecretProvider`

8. **Test Coverage**
   - [ ] All test suites from spec implemented and passing
   - [ ] Edge cases covered (empty strings, missing fields, conflicts)
   - [ ] Success paths verified with assertions
   - [ ] Error paths verified with proper error matching

# Testing for Dev

## Unit Tests Structure

Create `packages/plugin-kubernetes/src/TlsSecretProvider.test.ts` with these test suites:

1. **prepare() tests**
   - Generates correct TLS Secret structure
   - Base64 encodes cert and key correctly
   - Defaults namespace to "default"
   - Throws on missing cert
   - Throws on missing key
   - Throws on non-object value

2. **getInjectionPayload() - env strategy tests**
   - Injects tls.crt with correct secretKeyRef
   - Injects tls.key with correct secretKeyRef
   - Injects both keys as separate env vars
   - Throws when key missing in env strategy
   - Throws when key is invalid (not 'tls.crt' or 'tls.key')
   - Throws when targetName missing or empty

3. **getInjectionPayload() - envFrom strategy tests**
   - Injects entire secret without prefix
   - Injects entire secret with prefix
   - Validates multiple different prefixes (should throw)
   - Validates mixed prefixed/non-prefixed (should throw)
   - Accepts same prefix across many injections
   - Accepts all undefined prefixes

4. **getTargetPath() tests**
   - Returns correct path for env strategy with default index
   - Returns correct path for env strategy with custom index
   - Returns correct path for envFrom strategy with default/custom index
   - Respects custom targetPath override
   - Throws on unsupported strategy kind

5. **getEffectIdentifier() tests**
   - Returns "namespace/name" format
   - Defaults namespace to "default" when missing

6. **mergeSecrets() tests**
   - Merges multiple effects for same secret
   - Throws on duplicate keys with different values

7. **Metadata tests**
   - Verifies supportedStrategies array
   - Verifies secretType value
   - Verifies targetKind value
   - Verifies allowMerge flag

## Manual Testing

```bash
# Run tests for plugin-kubernetes package
pnpm --filter=@kubricate/plugin-kubernetes test

# Watch mode during development
pnpm --filter=@kubricate/plugin-kubernetes test:watch

# View coverage
pnpm --filter=@kubricate/plugin-kubernetes test:coverage
```

## Integration Testing Checklist

- [ ] Test with real PEM certificate and key files
- [ ] Verify generated Secret YAML is valid
- [ ] Test injection into actual Deployment manifest
- [ ] Verify env strategy creates correct envVar entries
- [ ] Verify envFrom strategy creates correct envFromSource entries
- [ ] Test with multiple containers (custom index)
- [ ] Test merge scenario with multiple secret effects

# Q&A

- **Requirement**

    - **Q: Why support env/envFrom when volumes are the standard for TLS certificates?**
      - A: This initial implementation mirrors existing provider primitives to reduce surface area and reuse validation/merge logic. Volume support can be added in a future `VolumeSecretProvider` or as an enhancement to this provider.

    - **Q: Should we support `ca.crt` (Certificate Authority) in addition to cert/key?**
      - A: Out of scope for initial implementation. The `kubernetes.io/tls` type only requires `tls.crt` and `tls.key`. CA certificates are typically stored in separate `Opaque` secrets or config maps.

    - **Q: What happens if user provides non-PEM formatted strings?**
      - A: The provider validates that strings are non-empty but does not validate PEM format. Kubernetes will accept any base64-encoded data, but the resulting secret may not work correctly. Future enhancement could add PEM format validation.

    - **Q: Can we merge effects that add different keys (one adds tls.crt, another adds tls.key)?**
      - A: Yes, the merge handler will combine the data objects as long as there are no conflicting keys with different values.

- **Technical**

    - **Q: Which base64 encoding method should we use?**
      - A: Use `Base64.encode()` from the existing utilities, consistent with other providers in the codebase.

    - **Q: How do we ensure prefix consistency validation matches BasicAuthSecretProvider?**
      - A: Copy the exact validation logic and error message format from `BasicAuthSecretProvider.getInjectionPayload()` for envFrom strategy.

    - **Q: Should getEffectIdentifier include the secret type?**
      - A: No, just return `"<namespace>/<name>"` to match existing provider patterns. The effect identifier is used for deduplication, not type differentiation.

    - **Q: Where should the TlsSecretProvider be located?**
      - A: In `packages/plugin-kubernetes/src/TlsSecretProvider.ts` alongside `OpaqueSecretProvider`, `DockerConfigSecretProvider`, and `BasicAuthSecretProvider`.
