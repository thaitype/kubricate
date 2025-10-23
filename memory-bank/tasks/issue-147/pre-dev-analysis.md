# Pre Development Analysis Document

## 1) Introduction

This work implements `TlsSecretProvider` to enable type-safe management of TLS certificates and private keys in Kubernetes through Kubricate's declarative secret management system.

### Why This Work Is Needed

1. **Complete Secret Type Coverage**: Kubernetes defines standard secret types including `kubernetes.io/tls` for TLS certificates. Kubricate currently supports `Opaque`, `kubernetes.io/dockerconfigjson`, and `kubernetes.io/basic-auth` but lacks TLS secret support, leaving a gap in the provider ecosystem.

2. **Type-Safe TLS Management**: Organizations managing TLS certificates for ingress controllers, service meshes, or mTLS configurations need a type-safe, validated way to generate these secrets without manual YAML construction.

3. **Consistent Developer Experience**: Following the established patterns from `BasicAuthSecretProvider` and `DockerConfigSecretProvider` ensures developers can apply the same mental model and API across all secret types, reducing cognitive load.

4. **GitOps & Declarative Workflow**: By treating TLS secrets as declarative code with hydration from external sources (connectors), teams can manage certificate lifecycles through version control while keeping sensitive material out of repositories.

## 2) Impact Analysis

### Systems/Components Impacted

#### Core Implementation Files
- **`packages/plugin-kubernetes/src/TlsSecretProvider.ts`** (NEW)
  - Main provider implementation
  - Implements `BaseProvider<TlsSecretProviderConfig, SupportedStrategies>`
  - Handles PEM certificate/key validation, base64 encoding, and Kubernetes manifest generation

- **`packages/plugin-kubernetes/src/TlsSecretProvider.test.ts`** (NEW)
  - Comprehensive unit tests covering all provider methods
  - Validation of env/envFrom strategies
  - Effect merging and error handling tests

- **`packages/plugin-kubernetes/src/index.ts`** (MODIFIED)
  - Add export: `export * from './TlsSecretProvider.js';`
  - Makes provider publicly available from `@kubricate/plugin-kubernetes`

#### Dependent Packages (No Code Changes Required)
- **`@kubricate/core`**: Provides `BaseProvider` interface and types
- **`@kubricate/kubricate`**: CLI will automatically support new provider through runtime configuration
  - `SecretInjectionBuilder` already supports the inject() API patterns
  - `SecretsOrchestrator` already handles provider lifecycle

#### Utilities Reused (No Changes)
- **`packages/plugin-kubernetes/src/utils.ts`**: `parseZodSchema()` for input validation
- **`packages/plugin-kubernetes/src/merge-utils.ts`**: `createKubernetesMergeHandler()` for effect merging
- **`packages/plugin-kubernetes/src/kubernetes-types.ts`**: `EnvVar` and related type definitions

### User-Facing Impact

#### New Capabilities
1. Users can register TLS providers in setup-secrets.ts:
   ```ts
   export const secretManager = new SecretManager()
     .addConnector('EnvConnector', new EnvConnector())
     .addProvider(
       'TlsSecretProvider',
       new TlsSecretProvider({
         name: 'ingress-tls',
         namespace: 'production',
       })
     )
     .addSecret({
       name: 'INGRESS_TLS',
       provider: 'TlsSecretProvider',
     });
   ```

2. Stacks can inject TLS material using `.useSecrets()` API:
   ```ts
   // Example 1: Inject individual keys as env vars
   const app = Stack.fromTemplate(simpleAppTemplate, {...})
     .useSecrets(secretManager, c => {
       c.secrets('INGRESS_TLS').forName('TLS_CERT').inject('env', { key: 'tls.crt' });
       c.secrets('INGRESS_TLS').forName('TLS_KEY').inject('env', { key: 'tls.key' });
     });

   // Example 2: Inject all keys with envFrom and prefix
   const app = Stack.fromTemplate(simpleAppTemplate, {...})
     .useSecrets(secretManager, c => {
       c.secrets('INGRESS_TLS').inject('envFrom', { prefix: 'TLS_' });
     });
   ```

3. Secret values loaded from EnvConnector (.env file):
   ```env
   INGRESS_TLS_cert=-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----
   INGRESS_TLS_key=-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----
   ```

#### No Breaking Changes
- This is a purely additive feature
- Existing providers, connectors, and configurations remain unchanged
- Follows established patterns, ensuring API consistency

## 3) Tasks

### Implementation Plan

#### Task 1: Create Core Provider Implementation
**File**: `packages/plugin-kubernetes/src/TlsSecretProvider.ts`

**Subtasks**:
1. Define TypeScript interfaces and types:
   - `TlsSecretProviderConfig` interface (name, namespace?)
   - `SupportedStrategies` type alias (`'env' | 'envFrom'`)
   - Zod schema `tlsSecretSchema` for validation (cert, key)

2. Implement class structure:
   - Class declaration implementing `BaseProvider<TlsSecretProviderConfig, SupportedStrategies>`
   - Constructor accepting `TlsSecretProviderConfig`
   - Readonly metadata properties:
     - `allowMerge = true`
     - `secretType = 'Kubernetes.Secret.Tls'`
     - `targetKind = 'Deployment'`
     - `supportedStrategies: SupportedStrategies[] = ['env', 'envFrom']`

3. Implement required methods:
   - `prepare(name, value)`: Validate input, base64-encode cert/key, emit kubectl effect
   - `getInjectionPayload(injections)`: Route to env/envFrom handlers with strategy validation
   - `getTargetPath(strategy)`: Return correct path for env/envFrom strategies
   - `getEffectIdentifier(effect)`: Return `namespace/name` identifier
   - `mergeSecrets(effects)`: Delegate to `createKubernetesMergeHandler()`

4. Implement private helper methods:
   - `extractStrategy(injection)`: Extract strategy from meta or infer from path
   - `getEnvInjectionPayload(injections)`: Handle env strategy with key validation
   - `getEnvFromInjectionPayload(injections)`: Handle envFrom strategy with prefix validation

**Reference Pattern**: Copy `packages/plugin-kubernetes/src/BasicAuthSecretProvider.ts`, adapting:
- Schema keys: `username`/`password` → `cert`/`key`
- Kubernetes data keys: `username`/`password` → `tls.crt`/`tls.key`
- Secret type: `kubernetes.io/basic-auth` → `kubernetes.io/tls`
- Provider metadata: `Kubernetes.Secret.BasicAuth` → `Kubernetes.Secret.Tls`
- Valid env keys: `'username' | 'password'` → `'tls.crt' | 'tls.key'`

**Key Implementation Details**:
```typescript
// Schema validation
export const tlsSecretSchema = z.object({
  cert: z.string().min(1),
  key: z.string().min(1),
});

// prepare() method generates:
{
  apiVersion: 'v1',
  kind: 'Secret',
  type: 'kubernetes.io/tls',
  metadata: {
    name: this.config.name,
    namespace: this.config.namespace ?? 'default',
  },
  data: {
    'tls.crt': Base64.encode(parsedValue.cert),
    'tls.key': Base64.encode(parsedValue.key),
  },
}

// getEnvInjectionPayload() validates:
- strategy.key must be 'tls.crt' or 'tls.key'
- meta.targetName is required

// getEnvFromInjectionPayload() validates:
- All injections must have same prefix (or all undefined)
```

**Acceptance Criteria**:
- All TypeScript types properly exported
- JSDoc comments on public methods
- Error messages match `BasicAuthSecretProvider` style
- No ESLint/TypeScript errors

#### Task 2: Implement Comprehensive Test Suite
**File**: `packages/plugin-kubernetes/src/TlsSecretProvider.test.ts`

**Test Suites to Implement** (7 suites total):

1. **`describe('prepare')`** (6 tests)
   - ✓ Generates correct TLS Secret with type `kubernetes.io/tls`
   - ✓ Base64 encodes cert to `tls.crt` and key to `tls.key`
   - ✓ Defaults namespace to `"default"` when not specified
   - ✓ Throws validation error when cert missing
   - ✓ Throws validation error when key missing
   - ✓ Throws validation error when value is not an object

2. **`describe('getInjectionPayload - env strategy')`** (6 tests)
   - ✓ Injects `tls.crt` as environment variable
   - ✓ Injects `tls.key` as environment variable
   - ✓ Injects both keys as separate environment variables
   - ✓ Throws when `key` not specified in env strategy
   - ✓ Throws when `key` is invalid (not `'tls.crt'` or `'tls.key'`)
   - ✓ Throws when `targetName` missing or empty

3. **`describe('getInjectionPayload - envFrom strategy')`** (6 tests)
   - ✓ Injects entire secret without prefix
   - ✓ Injects entire secret with prefix
   - ✓ Throws on multiple different prefixes
   - ✓ Throws on mixed prefixed/non-prefixed injections
   - ✓ Accepts same prefix across multiple injections
   - ✓ Accepts all undefined prefixes

4. **`describe('getTargetPath')`** (5 tests)
   - ✓ Returns `spec.template.spec.containers[0].env` for env strategy (default index)
   - ✓ Returns correct path with custom container index for env strategy
   - ✓ Returns `spec.template.spec.containers[0].envFrom` for envFrom strategy
   - ✓ Respects custom `targetPath` override when provided
   - ✓ Throws on unsupported strategy kind

5. **`describe('getEffectIdentifier')`** (2 tests)
   - ✓ Returns `"namespace/name"` format
   - ✓ Defaults namespace to `"default"` when missing

6. **`describe('mergeSecrets')`** (2 tests)
   - ✓ Merges multiple effects for same `(namespace, name)` combination
   - ✓ Throws error on duplicate keys with different values

7. **`describe('metadata')`** (4 tests)
   - ✓ `supportedStrategies` contains `['env', 'envFrom']`
   - ✓ `secretType` equals `'Kubernetes.Secret.Tls'`
   - ✓ `targetKind` equals `'Deployment'`
   - ✓ `allowMerge` equals `true`

**Reference Pattern**: Copy `packages/plugin-kubernetes/src/BasicAuthSecretProvider.test.ts` structure

**Acceptance Criteria**:
- All 31 tests implemented and passing
- Test coverage matches or exceeds `BasicAuthSecretProvider` coverage
- Uses Vitest framework with proper assertions
- Tests both success and error paths

#### Task 3: Update Package Exports
**File**: `packages/plugin-kubernetes/src/index.ts`

**Changes**:
- Add line: `export * from './TlsSecretProvider.js';`
- Insert after `BasicAuthSecretProvider` export for alphabetical order

**Acceptance Criteria**:
- Provider exported and accessible from `@kubricate/plugin-kubernetes`
- No build errors in package

#### Task 4: Verification & Quality Checks
**Commands to Run**:

```bash
# Build the entire monorepo
pnpm build

# Run tests for plugin-kubernetes package
pnpm --filter=@kubricate/plugin-kubernetes test

# Run linting
pnpm lint:check

# Verify coverage
pnpm --filter=@kubricate/plugin-kubernetes test:coverage
```

**Acceptance Criteria**:
- All tests pass (31/31 in TlsSecretProvider.test.ts)
- No linting errors
- No TypeScript compilation errors
- Test coverage comparable to `BasicAuthSecretProvider`

### Task Dependencies & Order

```
Task 1 (TlsSecretProvider.ts)
  ↓
Task 2 (TlsSecretProvider.test.ts) ← Can be done in parallel with Task 3
  ↓
Task 3 (Update index.ts exports)
  ↓
Task 4 (Verification & Quality Checks)
```

**Recommended Approach**:
1. Implement Task 1 completely
2. Run Task 2 and Task 3 in parallel (tests can be written while updating exports)
3. Run Task 4 to verify everything works end-to-end

## 4) Test Cases from Developer

### Unit Test Validation Strategy

All test cases are defined in the implementation plan (Task 2) with 31 total tests across 7 suites. Key validation scenarios:

#### Critical Path Tests

1. **Secret Generation Correctness**
   ```typescript
   // Test: prepare() generates valid kubernetes.io/tls Secret
   const provider = new TlsSecretProvider({ name: 'test-tls' });
   const effects = provider.prepare('MY_TLS', {
     cert: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
     key: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----'
   });

   expect(effects[0].value.type).toBe('kubernetes.io/tls');
   expect(effects[0].value.data['tls.crt']).toBeDefined();
   expect(effects[0].value.data['tls.key']).toBeDefined();
   ```

2. **Base64 Encoding Verification**
   ```typescript
   // Test: cert and key are properly base64-encoded
   const effects = provider.prepare('MY_TLS', {
     cert: 'cert-content',
     key: 'key-content'
   });

   expect(Base64.decode(effects[0].value.data['tls.crt'])).toBe('cert-content');
   expect(Base64.decode(effects[0].value.data['tls.key'])).toBe('key-content');
   ```

3. **env Strategy Injection**
   ```typescript
   // Test: inject tls.crt as environment variable
   const injections = [{
     meta: {
       targetName: 'TLS_CERT',
       strategy: { kind: 'env', key: 'tls.crt' }
     },
     path: 'spec.template.spec.containers[0].env'
   }];

   const payload = provider.getInjectionPayload(injections);
   expect(payload[0].name).toBe('TLS_CERT');
   expect(payload[0].valueFrom.secretKeyRef.key).toBe('tls.crt');
   ```

4. **envFrom Strategy with Prefix**
   ```typescript
   // Test: inject entire secret with prefix
   const injections = [{
     meta: {
       strategy: { kind: 'envFrom', prefix: 'TLS_' }
     },
     path: 'spec.template.spec.containers[0].envFrom'
   }];

   const payload = provider.getInjectionPayload(injections);
   expect(payload[0].prefix).toBe('TLS_');
   expect(payload[0].secretRef.name).toBe(provider.config.name);
   ```

#### Error Handling Tests

5. **Input Validation**
   ```typescript
   // Test: throw on missing cert
   expect(() => {
     provider.prepare('MY_TLS', { key: 'key-only' });
   }).toThrow();

   // Test: throw on missing key
   expect(() => {
     provider.prepare('MY_TLS', { cert: 'cert-only' });
   }).toThrow();
   ```

6. **Strategy Validation**
   ```typescript
   // Test: throw on invalid key
   const injections = [{
     meta: {
       targetName: 'INVALID',
       strategy: { kind: 'env', key: 'invalid-key' }
     },
     path: 'spec.template.spec.containers[0].env'
   }];

   expect(() => {
     provider.getInjectionPayload(injections);
   }).toThrow(/Must be 'tls.crt' or 'tls.key'/);
   ```

7. **Mixed Strategy Detection**
   ```typescript
   // Test: throw when mixing env and envFrom strategies
   const injections = [
     {
       meta: { strategy: { kind: 'env', key: 'tls.crt' }, targetName: 'CERT' },
       path: 'spec.template.spec.containers[0].env'
     },
     {
       meta: { strategy: { kind: 'envFrom' } },
       path: 'spec.template.spec.containers[0].envFrom'
     }
   ];

   expect(() => {
     provider.getInjectionPayload(injections);
   }).toThrow(/Mixed injection strategies/);
   ```

### Manual Integration Testing

After implementation, create an example to manually verify:

```bash
# 1. Create example directory
mkdir -p examples/with-tls-secret/src
cd examples/with-tls-secret

# 2. Create package.json (copy from with-basic-auth-secret)

# 3. Create src/setup-secrets.ts
cat > src/setup-secrets.ts << 'EOF'
import { EnvConnector } from '@kubricate/plugin-env';
import { TlsSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider(
    'TlsSecretProvider',
    new TlsSecretProvider({
      name: 'ingress-tls',
      namespace: 'default',
    })
  )
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('TlsSecretProvider')
  .addSecret({
    name: 'INGRESS_TLS',
    provider: 'TlsSecretProvider',
  });
EOF

# 4. Create src/stacks.ts with both env and envFrom examples
# (similar to with-basic-auth-secret example structure)

# 5. Create .env file with test cert/key
cat > .env << 'EOF'
INGRESS_TLS_cert=-----BEGIN CERTIFICATE-----
MIICertDataHere
-----END CERTIFICATE-----
INGRESS_TLS_key=-----BEGIN PRIVATE KEY-----
MIIPrivateKeyDataHere
-----END PRIVATE KEY-----
EOF

# 6. Build and generate
pnpm build
pnpm --filter=@examples/with-tls-secret kubricate generate

# 7. Verify output contains:
# - Secret with type: kubernetes.io/tls
# - Deployment with env vars referencing tls.crt/tls.key
# - Deployment with envFrom referencing the secret
```

### Demonstration Checklist

To demonstrate work completion:

- [ ] All 31 unit tests pass (`pnpm --filter=@kubricate/plugin-kubernetes test`)
- [ ] Test coverage report shows parity with `BasicAuthSecretProvider`
- [ ] Build completes without errors (`pnpm build`)
- [ ] Linting passes (`pnpm lint:check`)
- [ ] Type checking passes (no TypeScript errors)
- [ ] Provider is exported from `@kubricate/plugin-kubernetes` package
- [ ] Can create TlsSecretProvider in setup-secrets.ts
- [ ] Can use `.inject('env', { key: 'tls.crt' })` in stacks
- [ ] Can use `.inject('envFrom', { prefix: 'TLS_' })` in stacks
- [ ] Generated Secret YAML has type: `kubernetes.io/tls`
- [ ] Error messages are clear and actionable (match `BasicAuthSecretProvider` style)
- [ ] JSDoc comments present on all public methods
- [ ] Code follows existing patterns and conventions

### Success Metrics

**Quantitative**:
- 31 unit tests implemented and passing
- 0 linting errors
- 0 type errors
- Test coverage ≥ 90% (matching other providers)

**Qualitative**:
- Code is readable and maintainable
- Error messages are helpful for debugging
- Implementation mirrors `BasicAuthSecretProvider` patterns
- API works with existing `SecretInjectionBuilder.inject()` patterns
- JSDoc documentation is comprehensive
