# Introduction

This feature adds a new Secret provider `ServiceAccountTokenSecretProvider` to the `@kubricate/plugin-kubernetes` package. It enables type-safe creation and injection of Kubernetes Service Account Token Secrets (`kubernetes.io/service-account-token`), which are used to bind ServiceAccount tokens to Pods.

Unlike other secret types where data is explicitly set, Service Account Token secrets are **controller-populated** by Kubernetes after creation when the proper annotation is set (`kubernetes.io/service-account.name`). The controller automatically injects:
- `token` — JWT bound to the ServiceAccount
- `ca.crt` — cluster CA certificate (PEM)
- `namespace` — namespace of the ServiceAccount

This provider follows the same architectural patterns as existing providers (`OpaqueSecretProvider`, `DockerConfigSecretProvider`, `BasicAuthSecretProvider`) to maintain consistency across the framework.

# Glossary

- **ServiceAccountTokenSecretProvider**: A provider class that creates and manages Kubernetes Service Account Token Secrets
- **Service Account Token Secret**: A Kubernetes Secret of type `kubernetes.io/service-account-token` that contains authentication tokens for ServiceAccounts
- **Controller-populated**: Data that is automatically filled in by Kubernetes controllers after resource creation, not by the user
- **Provider**: A Kubricate abstraction that converts secrets into Kubernetes-native resources or injection strategies
- **Injection Strategy**: The method used to inject secrets into workloads (e.g., `env`, `envFrom`)
- **PreparedEffect**: A Kubricate representation of a kubectl operation to be applied
- **EnvVar**: Kubernetes environment variable definition
- **EnvFromSource**: Kubernetes environment variable source that injects all keys from a ConfigMap or Secret

# Requirement

## Functional Requirement

### FR-1: Provider Configuration
- The provider MUST accept configuration including:
  - `name` (required): Name of the Kubernetes Secret to create/use
  - `namespace` (optional): Namespace for the Secret (default: 'default')

### FR-2: Secret Value Schema
- The provider MUST validate secret values using a Zod schema requiring:
  - `serviceAccountName` (required): The ServiceAccount name to bind the token to
  - `annotations` (optional): Additional annotations to attach to the Secret
- The provider MUST always set/override the annotation `kubernetes.io/service-account.name` to match `serviceAccountName`

### FR-3: Secret Preparation (`prepare()`)
- The provider MUST generate a Kubernetes Secret manifest with:
  - `type: kubernetes.io/service-account-token`
  - Required annotation: `kubernetes.io/service-account.name` set to the provided ServiceAccount name
  - NO `data` field (controller will populate)
  - Support for merging additional annotations from the value
- The provider MUST return a single `kubectl` PreparedEffect

### FR-4: Injection Strategies
- The provider MUST support two injection strategies:
  - **`env`**: Inject a single key as an environment variable
  - **`envFrom`**: Inject all keys from the Secret (with optional prefix)
- The provider MUST NOT support any other injection strategies

### FR-5: Environment Variable Injection (`env`)
- When using `env` strategy, the provider MUST:
  - Require `meta.targetName` (the environment variable name)
  - Require `strategy.key` to be one of: `'token'`, `'ca.crt'`, or `'namespace'`
  - Generate `EnvVar[]` with `valueFrom.secretKeyRef` pointing to the secret and key
- The provider MUST reject invalid or missing keys with clear error messages

### FR-6: Environment From Source Injection (`envFrom`)
- When using `envFrom` strategy, the provider MUST:
  - Validate that all injections in a single call use `envFrom` (no mixing)
  - Validate that all injections use the same prefix (or all have no prefix)
  - Generate a single `EnvFromSource` with the common prefix (if any)
- The provider MUST reject conflicting prefixes with an enumerated list of detected prefixes

### FR-7: Target Path Resolution
- The provider MUST implement `getTargetPath()` to resolve injection paths:
  - `'env'`: Default to `spec.template.spec.containers[0].env` (or custom container index)
  - `'envFrom'`: Default to `spec.template.spec.containers[0].envFrom` (or custom container index)
  - Support custom `targetPath` override
- The provider MUST throw errors for unsupported strategies

### FR-8: Effect Identification
- The provider MUST implement `getEffectIdentifier()` to return `"<namespace>/<name>"` format
- The provider MUST default to `"default"` namespace if not specified

### FR-9: Secret Merging
- The provider MUST support merging multiple effects using `createKubernetesMergeHandler()`
- The provider MUST deduplicate effects by `namespace/name`
- The provider MUST set `allowMerge = true`

### FR-10: Validation and Error Handling
- The provider MUST detect and reject mixed strategies with informative error messages
- The provider MUST validate required fields (`targetName`, `key`, `serviceAccountName`)
- The provider MUST provide clear, actionable error messages following the same tone as `BasicAuthSecretProvider`

## Non-Functional Requirement

### NFR-1: Code Quality
- The implementation MUST maintain parity with `BasicAuthSecretProvider` in terms of:
  - Code structure and organization
  - Error message clarity and helpfulness
  - Test coverage and comprehensiveness

### NFR-2: Type Safety
- The provider MUST leverage TypeScript's type system for compile-time safety
- All configuration and value schemas MUST use Zod for runtime validation

### NFR-3: Maintainability
- The provider MUST include comprehensive JSDoc comments
- JSDoc SHOULD link to official Kubernetes documentation for service account tokens
- Code MUST follow existing patterns and conventions in the `@kubricate/plugin-kubernetes` package

### NFR-4: Performance
- The provider MUST not introduce unnecessary computation or memory overhead
- Validation and merging operations SHOULD be efficient for typical workloads

### NFR-5: Compatibility
- The provider MUST be compatible with the target Kubernetes API version supported by the project
- The provider MUST integrate seamlessly with existing Kubricate secret management workflows

# Diagram/User Interface

## Example Usage

### Basic Setup
```typescript
const provider = new ServiceAccountTokenSecretProvider({
  name: 'my-sa-token',
  namespace: 'production',
});
```

### Creating the Secret (via prepare)
```typescript
const effects = provider.prepare('SERVICE_ACCOUNT_TOKEN', {
  serviceAccountName: 'api-runner',
  annotations: {
    'app.kubernetes.io/managed-by': 'kubricate',
  },
});
```

### Inject Single Key as Environment Variable
```typescript
const envPayload = provider.getInjectionPayload([
  {
    providerId: 'serviceAccountToken',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].env',
    meta: {
      secretName: 'SERVICE_ACCOUNT_TOKEN',
      targetName: 'SERVICE_ACCOUNT_JWT',
      strategy: { kind: 'env', key: 'token' },
    },
  },
]);
```

### Inject All Keys with Prefix
```typescript
const envFromPayload = provider.getInjectionPayload([
  {
    providerId: 'serviceAccountToken',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].envFrom',
    meta: {
      secretName: 'SERVICE_ACCOUNT_TOKEN',
      targetName: 'SERVICE_ACCOUNT_TOKEN',
      strategy: { kind: 'envFrom', prefix: 'SA_' },
    },
  },
]);
```

## Generated Secret Manifest

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-sa-token
  namespace: production
  annotations:
    kubernetes.io/service-account.name: api-runner
    app.kubernetes.io/managed-by: kubricate
type: kubernetes.io/service-account-token
# Note: data field is omitted - controller will populate token/ca.crt/namespace
```

# Acceptance Criteria

## AC-1: Provider Class Implementation
- [ ] `ServiceAccountTokenSecretProvider` class is created in `@kubricate/plugin-kubernetes`
- [ ] Class extends `BaseProvider` from `@kubricate/core`
- [ ] Configuration interface is defined and documented
- [ ] Value schema is defined using Zod

## AC-2: Core Methods Implementation
- [ ] `prepare()` method generates correct Secret manifest without data field
- [ ] `getInjectionPayload()` handles both `env` and `envFrom` strategies
- [ ] `getTargetPath()` resolves correct paths for both strategies
- [ ] `getEffectIdentifier()` returns correct namespace/name format
- [ ] `mergeSecrets()` deduplicates effects properly

## AC-3: Validation and Error Handling
- [ ] Mixed strategies are detected and rejected with helpful error messages
- [ ] Missing required fields (`targetName`, `key`) trigger appropriate errors
- [ ] Invalid keys are rejected with list of valid keys
- [ ] Conflicting `envFrom` prefixes are detected with enumerated list
- [ ] All error messages match the tone and clarity of `BasicAuthSecretProvider`

## AC-4: Metadata
- [ ] `secretType` is set to `'Kubernetes.Secret.ServiceAccountToken'`
- [ ] `targetKind` is set to `'Deployment'`
- [ ] `supportedStrategies` includes only `['env', 'envFrom']`
- [ ] `allowMerge` is set to `true`

## AC-5: Testing
- [ ] All 27 test cases from the test plan are implemented
- [ ] Tests achieve high coverage (>90%) of provider code
- [ ] Tests follow Vitest conventions and project standards
- [ ] Tests validate both positive and negative scenarios

## AC-6: Documentation
- [ ] JSDoc comments are added to all public methods and interfaces
- [ ] Links to Kubernetes documentation are included where appropriate
- [ ] Provider is exported from package `index.ts`
- [ ] Example usage is documented in code comments

## AC-7: Integration
- [ ] Provider works with existing secret management workflows
- [ ] Provider can be registered with `SecretManager`
- [ ] Provider integrates with Stack's `.useSecrets()` method
- [ ] Provider effects can be applied via `kubricate secret apply`

# Testing for Dev

## Unit Tests (Vitest)

### `prepare()` Method (4 tests)
1. **Generates correct Secret skeleton**
   - Assert `type: 'kubernetes.io/service-account-token'`
   - Assert `metadata.annotations['kubernetes.io/service-account.name']` is set correctly
   - Assert no `data` property is present

2. **Uses default namespace**
   - When namespace is not provided in config, assert namespace defaults to 'default'

3. **Merges additional annotations but overrides SA name**
   - Provide custom annotations in value
   - Assert custom annotations are preserved
   - Assert `kubernetes.io/service-account.name` is overridden with `serviceAccountName`

4. **Returns one kubectl effect with secretName and providerName**
   - Assert exactly one effect is returned
   - Assert effect has correct `secretName` and `providerName`

### `getInjectionPayload()` — env Strategy (5 tests)
5. **Inject 'token' key**
   - Assert yields `EnvVar` with `secretKeyRef.key = 'token'`

6. **Inject 'ca.crt' and 'namespace' keys**
   - Assert correct `secretKeyRef.key` for each

7. **Missing key throws error**
   - Assert throws with message about required key

8. **Invalid key throws error**
   - Provide invalid key (e.g., 'aud')
   - Assert throws with message listing valid keys

9. **Missing targetName throws error**
   - Assert throws with message about missing targetName

### `getInjectionPayload()` — envFrom Strategy (6 tests)
10. **Single envFrom without prefix**
    - Assert returns `[{ secretRef: { name: <config.name> } }]`

11. **Single envFrom with prefix**
    - Assert returns `[{ prefix: 'SA_', secretRef: { name: <config.name> } }]`

12. **Multiple envFrom with same prefix**
    - Assert returns single entry with common prefix

13. **Multiple envFrom without prefix**
    - Assert returns single entry without prefix

14. **Mixed prefixes throws error**
    - Provide injections with 'API_' and 'DB_' prefixes
    - Assert throws with both prefixes enumerated

15. **Mixed prefixed and non-prefixed throws error**
    - Assert throws with '(none)' included in error message

### Mixed Strategy Validation (2 tests)
16. **Mixed env and envFrom throws error**
    - Provide one 'env' and one 'envFrom' injection
    - Assert throws with both strategy kinds listed and helpful hint

17. **Mixed strategies with same path**
    - Assert error message includes hint about "framework bug or incorrect targetPath"

### `getTargetPath()` Method (5 tests)
18. **'env' default container index**
    - Assert returns `spec.template.spec.containers[0].env`

19. **'env' custom container index**
    - Provide containerIndex: 2
    - Assert returns `spec.template.spec.containers[2].env`

20. **'envFrom' default and custom index**
    - Assert correct paths for both scenarios

21. **Custom targetPath override**
    - Provide custom targetPath in strategy
    - Assert returns targetPath verbatim

22. **Unsupported strategy throws error**
    - Provide unsupported strategy (e.g., 'volume')
    - Assert throws appropriate error

### `getEffectIdentifier()` Method (1 test)
23. **Returns namespace/name format**
    - Assert returns `namespace/name`
    - Assert defaults to 'default' namespace when missing

### `mergeSecrets()` Method (2 tests)
24. **Identical effects are merged**
    - Create two identical effects for same namespace/name
    - Assert result contains only one effect

25. **Different namespaces are preserved**
    - Create effects with different namespaces
    - Assert both are preserved

### Metadata (2 tests)
26. **supportedStrategies contains both strategies**
    - Assert contains 'env' and 'envFrom'
    - Assert length is 2

27. **Metadata assertions**
    - Assert `secretType === 'Kubernetes.Secret.ServiceAccountToken'`
    - Assert `targetKind === 'Deployment'`
    - Assert `allowMerge === true`

## Integration Tests
- Test provider registration with `SecretManager`
- Test end-to-end secret creation and injection in Stack
- Test CLI command `kubricate secret apply` with service account token provider

## Manual Testing
- Create a real ServiceAccount in a test cluster
- Generate manifests using the provider
- Apply manifests and verify controller populates token/ca.crt/namespace
- Test injection into a Deployment Pod and verify environment variables

# Q&A

## Requirement

**Q: Why doesn't the provider set the `data` field in the Secret?**

A: Service Account Token secrets are special in Kubernetes. The data field is automatically populated by the Kubernetes token controller after the Secret is created, not by users. The controller looks for the `kubernetes.io/service-account.name` annotation to determine which ServiceAccount to bind the token to. If we tried to set the data ourselves, it would either be overwritten or cause conflicts.

**Q: What happens if the ServiceAccount doesn't exist?**

A: The Secret will be created successfully, but the controller won't populate the token data until the referenced ServiceAccount exists. This is Kubernetes' default behavior. The provider validates that a ServiceAccount name is provided, but doesn't verify its existence (as that's a cluster-level concern and may vary across environments).

**Q: Can we use strategies other than `env` and `envFrom`?**

A: Not in the initial implementation. Future strategies like `volume`, `annotation`, or `helm` are planned for the framework but not yet implemented. The provider explicitly supports only `env` and `envFrom` to maintain clarity and prevent misuse.

**Q: Why do we need to validate prefix consistency for `envFrom`?**

A: When using `envFrom`, all environment variables from the Secret are injected with an optional prefix. If multiple injections for the same secret used different prefixes, it would create ambiguity about which prefix should be applied. The validation ensures consistent behavior and catches configuration errors early.

## Technical

**Q: Should we use `parseZodSchema` or validate manually?**

A: Use the `parseZodSchema` helper provided by the framework. It provides consistent error formatting and integrates with the framework's error handling patterns.

**Q: How do we handle the ServiceAccount name annotation override?**

A: The provider should merge any user-provided annotations from `value.annotations`, but then explicitly set/override `kubernetes.io/service-account.name` to ensure it always matches the `serviceAccountName` from the validated value. This prevents user error while still allowing additional annotations.

**Q: Should `mergeSecrets()` do anything special since there's no data?**

A: No special handling is needed. The existing `createKubernetesMergeHandler()` will deduplicate by namespace/name. Since there's no data field to conflict, merges are effectively no-ops, but deduplication is still valuable to prevent duplicate Secret definitions.

**Q: What should happen if someone tries to inject all three keys separately using `env`?**

A: This is allowed. Each injection would create a separate `EnvVar` entry, all referencing the same Secret but different keys. The provider doesn't restrict the number of `env` injections, only validates that each one specifies a valid key.

**Q: Why is `targetKind` set to `'Deployment'`?**

A: Following the convention of other providers in the package, `targetKind` indicates the primary Kubernetes resource type this provider targets for injection. While the Secret itself is a standalone resource, injections typically happen into Deployment specs (specifically their Pod templates). This may be extended in the future to support other workload types.
