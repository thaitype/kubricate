# Pre Development Analysis Document

## 1) Introduction

### Why We Do This Work

Kubernetes supports several built-in Secret types, including `kubernetes.io/basic-auth` for storing HTTP basic authentication credentials. Currently, Kubricate only provides first-class support for:
- **Opaque** secrets (generic key-value pairs)
- **Docker config** secrets (image pull credentials)

However, many applications require basic authentication (username/password) for accessing APIs, databases, or other services. While users can technically store these in Opaque secrets, there's no type safety or validation to ensure the correct structure (`username` and `password` keys as required by Kubernetes spec).

**BasicAuthSecretProvider** will:
- Provide first-class, type-safe support for `kubernetes.io/basic-auth` Secret type
- Enable both granular injection (`env` with key selection) and bulk injection (`envFrom`)
- Maintain consistency with Kubernetes spec (fixed keys: `username` and `password`)
- Improve developer experience with clear validation errors
- Set a pattern for future specialized providers (TLS, SSH, etc.)

### Business Value

1. **Type Safety**: Catch configuration errors at development time, not deployment time
2. **Developer Experience**: Clear, consistent API for a common use case
3. **Kubernetes Compliance**: Generate spec-compliant `kubernetes.io/basic-auth` secrets
4. **Reduced Boilerplate**: One provider handles both individual field injection and bulk injection
5. **Future-Proofing**: Establishes patterns for other specialized secret types

---

## 2) Impact Analysis

This feature impacts multiple layers of the Kubricate framework. Below is a comprehensive analysis of affected systems.

### 2.1 Type System (`@kubricate/core/src/types.ts`)

**Current State:**
```typescript
export type SecretInjectionStrategy =
  | ({ kind: 'env'; containerIndex?: number } & BaseSecretInjectionStrategy)
  | ({ kind: 'envFrom'; containerIndex?: number } & BaseSecretInjectionStrategy)
  | ...
```

**Required Changes:**
1. Add optional `key` parameter to `env` strategy for selecting specific keys from multi-key secrets
2. Add optional `prefix` parameter to `envFrom` strategy (standard Kubernetes feature)

**Impact:**
- ✅ Backward compatible (all new fields are optional)
- ✅ Enables provider-specific validation (e.g., BasicAuthSecretProvider requires `key`)
- ✅ OpaqueSecretProvider can optionally support `key` for advanced use cases

**Example:**
```typescript
export type SecretInjectionStrategy =
  | ({ kind: 'env'; containerIndex?: number; key?: string } & BaseSecretInjectionStrategy)
  | ({ kind: 'envFrom'; containerIndex?: number; prefix?: string } & BaseSecretInjectionStrategy)
  | ...
```

---

### 2.2 New Provider (`packages/plugin-kubernetes/src/BasicAuthSecretProvider.ts`)

**Implementation Requirements:**

1. **Supported Strategies**: `['env', 'envFrom']`
2. **Secret Type**: `kubernetes.io/basic-auth`
3. **Fixed Keys**: `username`, `password` (per Kubernetes spec)
4. **Provider Interface**:

```typescript
export class BasicAuthSecretProvider implements BaseProvider<BasicAuthSecretProviderConfig, 'env' | 'envFrom'> {
  readonly supportedStrategies = ['env', 'envFrom'];
  readonly secretType = 'Kubernetes.Secret.BasicAuth';
  readonly targetKind = 'Deployment';
  readonly allowMerge = true;

  prepare(name: string, value: SecretValue): PreparedEffect[];
  getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] | EnvFromSource[];
  getTargetPath(strategy: SecretInjectionStrategy): string;
  getEffectIdentifier(effect: PreparedEffect): string;
  mergeSecrets(effects: PreparedEffect[]): PreparedEffect[];
}
```

**Validation Schema** (using Zod):
```typescript
const basicAuthSecretSchema = z.object({
  username: z.string(),
  password: z.string(),
});
```

**Key Features:**
- Validate that secret value contains exactly `username` and `password` keys
- For `env` strategy: require `key` parameter and validate it's either `'username'` or `'password'`
- For `env` strategy: require `.forName()` to specify the target env var name
- For `envFrom` strategy: inject entire secret with optional prefix
- Use same merge handler as OpaqueSecretProvider (`createKubernetesMergeHandler`)

---

### 2.3 SecretInjectionBuilder (`packages/kubricate/src/secret/SecretInjectionBuilder.ts`)

**Current State:**
The `resolveDefaultStrategy()` method supports defaults for `env`, `imagePullSecret`, and `annotation`.

**Required Changes:**
Add support for `envFrom` default strategy:

```typescript
resolveDefaultStrategy(kind: SecretInjectionStrategy['kind']): SecretInjectionStrategy {
  // ... existing cases ...
  else if (kind === 'envFrom') {
    strategy = { kind: 'envFrom', containerIndex: 0 };
  }
  // ...
}
```

**Impact:**
- ✅ Enables `.inject()` with no args when provider only supports `envFrom`
- ✅ Consistent with existing pattern for `env`, `imagePullSecret`

---

### 2.4 OpaqueSecretProvider (Optional Enhancement)

**Current Behavior:**
OpaqueSecretProvider always uses `secretName` as both:
1. The key in the Kubernetes Secret's `data` field
2. The name of the environment variable (unless overridden with `.forName()`)

**Optional Enhancement:**
Support `strategy.key` to allow selecting a specific key from the secret when the secret contains multiple keys.

**Example Use Case:**
```typescript
// Secret has multiple keys: { API_URL: "...", API_KEY: "..." }
c.secrets('my_config')
  .forName('SERVICE_URL')
  .inject('env', { key: 'API_URL' });

c.secrets('my_config')
  .forName('SERVICE_KEY')
  .inject('env', { key: 'API_KEY' });
```

**Impact:**
- ⚠️ Low priority (nice-to-have, not required for BasicAuthSecretProvider)
- ✅ Backward compatible (key is optional, defaults to current behavior)

---

### 2.5 Test Coverage

**New Test File**: `packages/plugin-kubernetes/src/BasicAuthSecretProvider.test.ts`

Required test scenarios:
1. ✅ `prepare()` generates correct Secret with type `kubernetes.io/basic-auth`
2. ✅ `prepare()` validates secret value contains `username` and `password`
3. ✅ `prepare()` throws clear error if keys are missing or invalid
4. ✅ `getInjectionPayload()` for `env` strategy with `key='username'`
5. ✅ `getInjectionPayload()` for `env` strategy with `key='password'`
6. ✅ `getInjectionPayload()` throws error if `key` is missing in env strategy
7. ✅ `getInjectionPayload()` throws error if `key` is not `'username'` or `'password'`
8. ✅ `getInjectionPayload()` for `envFrom` strategy without prefix
9. ✅ `getInjectionPayload()` for `envFrom` strategy with prefix
10. ✅ `getTargetPath()` returns correct paths for both `env` and `envFrom`
11. ✅ `mergeSecrets()` correctly merges multiple secrets
12. ✅ Conflict detection when same env var name is used twice

**Integration Test Example**:
Create example in `examples/with-basic-auth-secret/` demonstrating real-world usage.

---

### 2.6 Package Exports

**File**: `packages/plugin-kubernetes/src/index.ts`

**Required Change**:
```typescript
export * from './BasicAuthSecretProvider.js';
```

**Impact**: Makes the provider available for import in user projects.

---

### 2.7 Documentation Impact

**Potentially Affected Files**:
1. `packages/plugin-kubernetes/README.md` - List BasicAuthSecretProvider
2. `docs/secrets.md` - Add usage examples
3. Main `README.md` - Mention support for basic-auth secrets

**Not in scope for this PR** but should be tracked for future documentation updates.

---

## 3) Tasks

Below is the step-by-step implementation plan with clear deliverables.

### Task 1: Update Type Definitions in `@kubricate/core`

**File**: `packages/core/src/types.ts`

**Changes**:
```typescript
export type SecretInjectionStrategy =
  | ({ kind: 'env'; containerIndex?: number; key?: string } & BaseSecretInjectionStrategy)
  | ({ kind: 'envFrom'; containerIndex?: number; prefix?: string } & BaseSecretInjectionStrategy)
  // ... rest unchanged
```

**Acceptance Criteria**:
- ✅ Type compiles without errors
- ✅ Backward compatible (existing code still works)
- ✅ `key` and `prefix` are optional

---

### Task 2: Create BasicAuthSecretProvider

**File**: `packages/plugin-kubernetes/src/BasicAuthSecretProvider.ts`

**Implementation Checklist**:

1. **Imports and Schema**
   ```typescript
   import { Base64 } from 'js-base64';
   import { z } from 'zod';
   import type { BaseProvider, PreparedEffect, ProviderInjection, SecretInjectionStrategy, SecretValue } from '@kubricate/core';

   export const basicAuthSecretSchema = z.object({
     username: z.string(),
     password: z.string(),
   });
   ```

2. **Config Interface**
   ```typescript
   export interface BasicAuthSecretProviderConfig {
     name: string;
     namespace?: string;
   }
   ```

3. **Provider Class**
   - Implement all required methods from `BaseProvider`
   - Use `parseZodSchema` helper from `./utils.js`
   - Use `createKubernetesMergeHandler` from `./merge-utils.js`

4. **Key Methods**:

   **`prepare()`**:
   - Validate with `basicAuthSecretSchema`
   - Base64-encode `username` and `password`
   - Return `PreparedEffect` with `type: 'kubernetes.io/basic-auth'`

   **`getInjectionPayload()`**:
   - Determine strategy kind from first injection
   - For `env`: validate `key` exists and is valid, return `EnvVar[]`
   - For `envFrom`: return `EnvFromSource[]` with optional prefix

   **`getTargetPath()`**:
   - For `env`: `spec.template.spec.containers[${index}].env`
   - For `envFrom`: `spec.template.spec.containers[${index}].envFrom`

**Acceptance Criteria**:
- ✅ Class compiles without errors
- ✅ All BaseProvider methods implemented
- ✅ Validation throws clear errors

---

### Task 3: Update SecretInjectionBuilder

**File**: `packages/kubricate/src/secret/SecretInjectionBuilder.ts`

**Change**: Add `envFrom` case to `resolveDefaultStrategy()`

```typescript
else if (kind === 'envFrom') {
  strategy = { kind: 'envFrom', containerIndex: 0 };
}
```

**Acceptance Criteria**:
- ✅ Method handles `envFrom` without throwing error
- ✅ Returns correct default strategy object

---

### Task 4 (Optional): Enhance OpaqueSecretProvider

**File**: `packages/plugin-kubernetes/src/OpaqueSecretProvider.ts`

**Change**: Support optional `strategy.key` parameter

**Not required for MVP** but improves consistency and unlocks advanced use cases.

---

### Task 5: Create Comprehensive Tests

**File**: `packages/plugin-kubernetes/src/BasicAuthSecretProvider.test.ts`

**Test Structure**:
```typescript
describe('BasicAuthSecretProvider', () => {
  describe('prepare()', () => {
    it('generates correct kubernetes.io/basic-auth Secret');
    it('validates username and password are present');
    it('throws error for invalid secret structure');
    it('base64-encodes username and password');
  });

  describe('getInjectionPayload() - env strategy', () => {
    it('injects username with key="username"');
    it('injects password with key="password"');
    it('throws error if key is missing');
    it('throws error if key is not username or password');
    it('uses targetName from meta');
  });

  describe('getInjectionPayload() - envFrom strategy', () => {
    it('injects entire secret without prefix');
    it('injects entire secret with prefix');
  });

  describe('getTargetPath()', () => {
    it('returns env path for env strategy');
    it('returns envFrom path for envFrom strategy');
    it('respects custom containerIndex');
  });

  describe('mergeSecrets()', () => {
    it('merges multiple effects for same secret');
    it('throws error on duplicate keys');
  });
});
```

**Acceptance Criteria**:
- ✅ All tests pass
- ✅ Code coverage > 90%

---

### Task 6: Update Package Exports

**File**: `packages/plugin-kubernetes/src/index.ts`

**Change**:
```typescript
export * from './BasicAuthSecretProvider.js';
```

**Acceptance Criteria**:
- ✅ Provider is importable from `@kubricate/plugin-kubernetes`

---

### Task 7: Manual Integration Testing

**Approach**:
1. Create a test stack using `BasicAuthSecretProvider`
2. Add secrets with username/password
3. Test `env` injection with both keys
4. Test `envFrom` injection with and without prefix
5. Verify generated YAML is correct

**Example Test Code**:
```typescript
const provider = new BasicAuthSecretProvider({ name: 'api-auth' });
const secretManager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('basicAuth', provider)
  .addSecret({ name: 'API_CREDENTIALS', provider: 'basicAuth' });

const app = Stack.fromTemplate(simpleAppTemplate, { ... })
  .useSecrets(secretManager, c => {
    // env with key
    c.secrets('API_CREDENTIALS')
      .forName('API_USER')
      .inject('env', { key: 'username' });

    c.secrets('API_CREDENTIALS')
      .forName('API_PASS')
      .inject('env', { key: 'password' });

    // envFrom with prefix
    c.secrets('API_CREDENTIALS')
      .inject('envFrom', { prefix: 'AUTH_' });
  });
```

**Acceptance Criteria**:
- ✅ `kubricate generate` produces valid YAML
- ✅ Secret has type `kubernetes.io/basic-auth`
- ✅ Env vars are correctly injected
- ✅ EnvFrom works with optional prefix

---

## 4) Test Cases from Developer

This section outlines the test cases that demonstrate the work has been completed successfully.

### Test Case 1: Basic Secret Generation

**Goal**: Verify that `prepare()` generates a valid `kubernetes.io/basic-auth` Secret.

**Setup**:
```typescript
const provider = new BasicAuthSecretProvider({
  name: 'my-basic-auth',
  namespace: 'production'
});
```

**Input**:
```typescript
const secretValue = {
  username: 'admin',
  password: 'super-secret-123'
};
```

**Action**:
```typescript
const effects = provider.prepare('API_CREDENTIALS', secretValue);
```

**Expected Output**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-basic-auth
  namespace: production
type: kubernetes.io/basic-auth
data:
  username: YWRtaW4=  # base64("admin")
  password: c3VwZXItc2VjcmV0LTEyMw==  # base64("super-secret-123")
```

**Verification**:
- ✅ `effects[0].type === 'kubectl'`
- ✅ `effects[0].value.type === 'kubernetes.io/basic-auth'`
- ✅ `effects[0].value.data.username` is base64 encoded
- ✅ `effects[0].value.data.password` is base64 encoded

---

### Test Case 2: Env Injection with Key Selection

**Goal**: Inject `username` and `password` as separate environment variables.

**Setup**:
```typescript
const injections: ProviderInjection[] = [
  {
    providerId: 'basicAuth',
    provider: providerInstance,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].env',
    meta: {
      secretName: 'API_CREDENTIALS',
      targetName: 'API_USER',
      strategy: { kind: 'env', key: 'username' }
    }
  },
  {
    providerId: 'basicAuth',
    provider: providerInstance,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].env',
    meta: {
      secretName: 'API_CREDENTIALS',
      targetName: 'API_PASSWORD',
      strategy: { kind: 'env', key: 'password' }
    }
  }
];
```

**Action**:
```typescript
const payload = provider.getInjectionPayload(injections);
```

**Expected Output**:
```typescript
[
  {
    name: 'API_USER',
    valueFrom: {
      secretKeyRef: {
        name: 'my-basic-auth',
        key: 'username'
      }
    }
  },
  {
    name: 'API_PASSWORD',
    valueFrom: {
      secretKeyRef: {
        name: 'my-basic-auth',
        key: 'password'
      }
    }
  }
]
```

**Verification**:
- ✅ Two EnvVar objects returned
- ✅ Correct `name` values from `targetName`
- ✅ Correct `key` values in `secretKeyRef`

---

### Test Case 3: EnvFrom Injection with Prefix

**Goal**: Inject entire secret using `envFrom` with prefix.

**Setup**:
```typescript
const injections: ProviderInjection[] = [
  {
    providerId: 'basicAuth',
    provider: providerInstance,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].envFrom',
    meta: {
      secretName: 'API_CREDENTIALS',
      strategy: { kind: 'envFrom', prefix: 'BASIC_' }
    }
  }
];
```

**Action**:
```typescript
const payload = provider.getInjectionPayload(injections);
```

**Expected Output**:
```typescript
[
  {
    prefix: 'BASIC_',
    secretRef: {
      name: 'my-basic-auth'
    }
  }
]
```

**Resulting Kubernetes Behavior**:
Container will have environment variables:
- `BASIC_username=admin`
- `BASIC_password=super-secret-123`

**Verification**:
- ✅ Single EnvFromSource object returned
- ✅ Prefix is applied
- ✅ secretRef.name matches provider config

---

### Test Case 4: Error Validation - Missing Key

**Goal**: Verify clear error when `key` is missing in `env` strategy.

**Action**:
```typescript
const injections: ProviderInjection[] = [
  {
    // ... setup
    meta: {
      secretName: 'API_CREDENTIALS',
      targetName: 'API_USER',
      strategy: { kind: 'env' } // ❌ missing key
    }
  }
];

provider.getInjectionPayload(injections);
```

**Expected Error**:
```
Error: [BasicAuthSecretProvider] 'key' is required for env injection. Must be 'username' or 'password'.
```

**Verification**:
- ✅ Error is thrown
- ✅ Error message is clear and actionable

---

### Test Case 5: Error Validation - Invalid Key

**Goal**: Verify error when `key` is not `'username'` or `'password'`.

**Action**:
```typescript
const injections: ProviderInjection[] = [
  {
    // ... setup
    meta: {
      secretName: 'API_CREDENTIALS',
      targetName: 'API_USER',
      strategy: { kind: 'env', key: 'email' } // ❌ invalid key
    }
  }
];

provider.getInjectionPayload(injections);
```

**Expected Error**:
```
Error: [BasicAuthSecretProvider] Invalid key 'email'. Must be 'username' or 'password'.
```

**Verification**:
- ✅ Error is thrown
- ✅ Error specifies valid options

---

### Test Case 6: Error Validation - Missing forName

**Goal**: Verify SecretInjectionBuilder throws error when `.forName()` is not called for `env` strategy.

**Action**:
```typescript
// This is validated at the builder level, not the provider
const builder = new SecretInjectionBuilder(stack, 'API_CREDENTIALS', provider, ctx);
builder.inject('env', { key: 'username' });
builder.resolveInjection(); // ❌ no .forName() called
```

**Expected Error**:
```
Error: Missing targetName (.forName) for secret injection
```

**Verification**:
- ✅ Error is thrown before reaching provider
- ✅ Clear guidance on required method

---

### Test Case 7: Integration Test - Full Stack

**Goal**: End-to-end test generating a complete deployment with basic auth secrets.

**Setup**:
Create `.env` file:
```env
API_CREDENTIALS={"username":"admin","password":"my-secret-pass"}
```

**Stack Definition**:
```typescript
const secretManager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('basicAuth', new BasicAuthSecretProvider({ name: 'api-auth' }))
  .setDefaultConnector('env')
  .setDefaultProvider('basicAuth')
  .addSecret({ name: 'API_CREDENTIALS' });

const app = Stack.fromTemplate(simpleAppTemplate, {
  name: 'my-app',
  imageName: 'nginx'
}).useSecrets(secretManager, c => {
  c.secrets('API_CREDENTIALS').forName('USERNAME').inject('env', { key: 'username' });
  c.secrets('API_CREDENTIALS').forName('PASSWORD').inject('env', { key: 'password' });
});
```

**Action**:
```bash
kubricate generate
```

**Expected Output** (`output/app.yml`):
```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: api-auth
  namespace: default
type: kubernetes.io/basic-auth
data:
  username: YWRtaW4=
  password: bXktc2VjcmV0LXBhc3M=
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: nginx
        env:
        - name: USERNAME
          valueFrom:
            secretKeyRef:
              name: api-auth
              key: username
        - name: PASSWORD
          valueFrom:
            secretKeyRef:
              name: api-auth
              key: password
```

**Verification**:
- ✅ Secret is generated with correct type
- ✅ Deployment references secret correctly
- ✅ Both username and password are injected as separate env vars
- ✅ YAML is valid and deployable to Kubernetes

---

## Summary

This pre-dev analysis provides a complete blueprint for implementing `BasicAuthSecretProvider`. The implementation:

1. **Extends the type system** to support `key` and `prefix` parameters
2. **Creates a new provider** following existing patterns from `OpaqueSecretProvider` and `DockerConfigSecretProvider`
3. **Maintains backward compatibility** with all existing code
4. **Provides comprehensive validation** with clear error messages
5. **Includes thorough testing** at unit, integration, and end-to-end levels

The work is scoped to deliver a production-ready feature that sets a pattern for future specialized secret providers (TLS, SSH, etc.) while maintaining the simplicity and type safety that defines Kubricate's developer experience.
