# Pre Development Analysis Document

## 1) Introduction

### Purpose
Implement **SshAuthSecretProvider** to enable type-safe management of Kubernetes `kubernetes.io/ssh-auth` secrets within Kubricate's declarative secret management system.

### Why This Work?
Following the successful implementation of `BasicAuthSecretProvider` (#140), users require similar support for SSH authentication secrets. SSH secrets are essential for:
- **Git repository access**: Private repositories, CI/CD pipelines
- **SSH-based deployments**: Secure deployment workflows
- **Service authentication**: Secure shell access to services
- **Network tunneling**: SSH tunneling and port forwarding

This implementation maintains API consistency with existing providers while extending Kubricate's secret management capabilities to cover a critical authentication use case.

### Business Value
- **Completeness**: Rounds out support for common Kubernetes Secret types
- **Developer Experience**: Provides type-safe, validated SSH secret handling
- **Consistency**: Follows established patterns from BasicAuthSecretProvider
- **Production Ready**: Comprehensive validation and error handling

---

## 2) Impact Analysis

### Files to Create

#### Core Implementation
- **`packages/plugin-kubernetes/src/SshAuthSecretProvider.ts`**
  - New provider class implementation
  - Schema definition: `sshAuthSecretSchema`
  - Interface: `SshAuthSecretProviderConfig`
  - Estimated: ~300-400 lines

#### Tests
- **`packages/plugin-kubernetes/src/SshAuthSecretProvider.test.ts`**
  - Comprehensive test suite (35+ tests)
  - Coverage target: ≥98%
  - Estimated: ~1000+ lines

#### Example Project
- **`examples/with-ssh-auth-secret/`**
  - `kubricate.config.ts` - Configuration demonstrating all usage patterns
  - `.env.example` - Template for secret values
  - `README.md` - Usage guide and troubleshooting
  - Generated manifests in `dist/`

### Files to Modify

#### Package Exports
- **`packages/plugin-kubernetes/src/index.ts`**
  - Add exports for `SshAuthSecretProvider`, `sshAuthSecretSchema`, `SshAuthSecretProviderConfig`
  - Impact: Public API surface expansion (non-breaking)

#### Type Definitions (if needed)
- **`packages/plugin-kubernetes/src/types.ts`** (if exists)
  - Potentially add SSH-specific type unions
  - Verify integration with existing provider types

### Dependencies

#### Direct Dependencies
- **`@kubricate/core`**: Extends `BaseProvider`
- **`zod`**: Schema validation for secret structure
- **`@kubricate/kubernetes-models`**: Kubernetes resource types (Secret, EnvVar, EnvFromSource)

#### Runtime Dependencies
- **Merge Handler**: Uses `createKubernetesMergeHandler()` for effect merging
- **SecretManager**: Integrates with existing secret orchestration

### System Components Impacted

#### 1. Plugin System
- **Plugin package**: `@kubricate/plugin-kubernetes`
- **Impact**: New provider available for registration
- **Risk**: Low - additive only, no existing code modified

#### 2. Secret Management System
- **Component**: `SecretManager`, `SecretsOrchestrator`
- **Impact**: New provider type registered, participates in hydration/validation
- **Risk**: Low - follows established provider contract

#### 3. Type System
- **Component**: TypeScript type inference for strategy options
- **Impact**: New strategy option types for `env` and `envFrom`
- **Risk**: Low - type-safe extensions

#### 4. Build System
- **Component**: Turbo build pipeline, package compilation
- **Impact**: New files compiled and included in distribution
- **Risk**: Minimal - follows existing build patterns

### Potential Side Effects

#### Positive
- **Pattern Consistency**: Reinforces provider implementation patterns
- **Documentation by Example**: Example project serves as reference
- **Test Coverage**: High test coverage ensures reliability

#### Risks
- **API Consistency**: Must maintain exact consistency with `BasicAuthSecretProvider` API
- **Error Message Quality**: Must provide clear, actionable error messages
- **Validation Logic**: Must prevent invalid configurations early

---

## 3) Tasks

### Phase 1: Core Implementation (3-4 hours)

#### Task 1.1: Create SshAuthSecretProvider Class
- [ ] Create `packages/plugin-kubernetes/src/SshAuthSecretProvider.ts`
- [ ] Implement class structure extending `BaseProvider`
- [ ] Define metadata properties:
  - `secretType = 'Kubernetes.Secret.SshAuth'`
  - `targetKind = 'Deployment'`
  - `supportedStrategies = ['env', 'envFrom']`
  - `allowMerge = true`

#### Task 1.2: Define Schema and Types
- [ ] Define `sshAuthSecretSchema` using Zod:
  ```typescript
  export const sshAuthSecretSchema = z.object({
    'ssh-privatekey': z.string().min(1, 'ssh-privatekey is required'),
    known_hosts: z.string().optional(),
  });
  ```
- [ ] Define `SshAuthSecretProviderConfig` interface:
  ```typescript
  export interface SshAuthSecretProviderConfig {
    name: string;
    namespace?: string;
  }
  ```

#### Task 1.3: Implement prepare() Method
- [ ] Validate input against `sshAuthSecretSchema`
- [ ] Generate Kubernetes Secret manifest:
  - Type: `kubernetes.io/ssh-auth`
  - Base64 encode `ssh-privatekey`
  - Base64 encode `known_hosts` (if provided)
- [ ] Use default namespace 'default' if not specified

#### Task 1.4: Implement getTargetPath() Method
- [ ] Handle `env` strategy: `spec.template.spec.containers[{containerIndex ?? 0}].env`
- [ ] Handle `envFrom` strategy: `spec.template.spec.containers[{containerIndex ?? 0}].envFrom`
- [ ] Honor custom `targetPath` when provided
- [ ] Throw for unsupported strategy kinds

#### Task 1.5: Implement getInjectionPayload() - env Strategy
- [ ] Implement `getEnvInjectionPayload()` helper
- [ ] Validate `meta.targetName` presence
- [ ] Validate `strategy.key` presence and value ('ssh-privatekey' | 'known_hosts')
- [ ] Generate EnvVar entries with secretKeyRef
- [ ] Implement strategy homogeneity validation

#### Task 1.6: Implement getInjectionPayload() - envFrom Strategy
- [ ] Implement `getEnvFromInjectionPayload()` helper
- [ ] Validate prefix consistency across injections
- [ ] Collapse multiple injections into single EnvFromSource
- [ ] Support optional prefix parameter

#### Task 1.7: Implement getEffectIdentifier() Method
- [ ] Return format: `{namespace}/{name}`
- [ ] Use 'default' when namespace omitted

#### Task 1.8: Integrate Merge Handler
- [ ] Use `createKubernetesMergeHandler()` for effect merging
- [ ] Ensure conflict detection works correctly

#### Task 1.9: Add JSDoc Documentation
- [ ] Document class and all public methods
- [ ] Include usage examples in JSDoc
- [ ] Document error scenarios

#### Task 1.10: Update Package Exports
- [ ] Add exports to `packages/plugin-kubernetes/src/index.ts`:
  ```typescript
  export { SshAuthSecretProvider, sshAuthSecretSchema } from './SshAuthSecretProvider';
  export type { SshAuthSecretProviderConfig } from './SshAuthSecretProvider';
  ```

### Phase 2: Testing (4-5 hours)

#### Task 2.1: Set Up Test File
- [ ] Create `packages/plugin-kubernetes/src/SshAuthSecretProvider.test.ts`
- [ ] Import necessary testing utilities and dependencies
- [ ] Set up test fixtures and mock data

#### Task 2.2: Test Suite - prepare() (8 tests)
- [ ] Test: Creates Secret with correct type `kubernetes.io/ssh-auth`
- [ ] Test: Base64 encodes `ssh-privatekey`
- [ ] Test: Base64 encodes `known_hosts` when provided
- [ ] Test: Omits `known_hosts` when not provided
- [ ] Test: Uses default namespace 'default' when not specified
- [ ] Test: Uses custom namespace when specified
- [ ] Test: Throws when `ssh-privatekey` is missing
- [ ] Test: Throws when input is not an object

#### Task 2.3: Test Suite - getInjectionPayload() env Strategy (7 tests)
- [ ] Test: Injects `ssh-privatekey` with correct secretKeyRef
- [ ] Test: Injects `known_hosts` with correct secretKeyRef
- [ ] Test: Generates multiple EnvVar entries for multiple injections
- [ ] Test: Throws when `key` is missing
- [ ] Test: Throws when `key` is invalid
- [ ] Test: Throws when `targetName` is missing
- [ ] Test: Uses correct environment variable name from targetName

#### Task 2.4: Test Suite - getInjectionPayload() envFrom Strategy (8 tests)
- [ ] Test: Generates single EnvFromSource without prefix
- [ ] Test: Generates single EnvFromSource with prefix
- [ ] Test: Prefix is correctly applied
- [ ] Test: Multiple injections with same prefix accepted
- [ ] Test: Multiple injections with no prefix accepted
- [ ] Test: Throws when different prefixes detected
- [ ] Test: Throws when mixing undefined and string prefix
- [ ] Test: Error message lists all detected prefixes

#### Task 2.5: Test Suite - Strategy Validation (5 tests)
- [ ] Test: Throws when mixing env and envFrom strategies
- [ ] Test: Error message includes both strategy kinds
- [ ] Test: Error message includes framework bug hint
- [ ] Test: Accepts homogeneous env strategies
- [ ] Test: Accepts homogeneous envFrom strategies

#### Task 2.6: Test Suite - getTargetPath() (6 tests)
- [ ] Test: Returns correct default path for env strategy
- [ ] Test: Returns correct default path for envFrom strategy
- [ ] Test: Honors containerIndex for env
- [ ] Test: Honors containerIndex for envFrom
- [ ] Test: Honors custom targetPath
- [ ] Test: Throws for unsupported strategy kind

#### Task 2.7: Test Suite - getEffectIdentifier() (2 tests)
- [ ] Test: Returns namespace/name format
- [ ] Test: Uses 'default' when namespace omitted

#### Task 2.8: Test Suite - mergeSecrets() (3 tests)
- [ ] Test: Merges compatible effects
- [ ] Test: Throws on duplicate key conflicts
- [ ] Test: Preserves all unique keys

#### Task 2.9: Test Suite - Metadata (4 tests)
- [ ] Test: secretType is 'Kubernetes.Secret.SshAuth'
- [ ] Test: targetKind is 'Deployment'
- [ ] Test: allowMerge is true
- [ ] Test: supportedStrategies contains ['env', 'envFrom']

#### Task 2.10: Verify Coverage
- [ ] Run coverage report: `pnpm test:coverage --filter=@kubricate/plugin-kubernetes`
- [ ] Ensure coverage ≥98%
- [ ] Identify and test uncovered branches

### Phase 3: Example Project (2-3 hours)

#### Task 3.1: Create Project Structure
- [ ] Create directory: `examples/with-ssh-auth-secret/`
- [ ] Copy package.json template from existing examples
- [ ] Update package name and dependencies

#### Task 3.2: Create Configuration
- [ ] Create `kubricate.config.ts` demonstrating:
  - Individual key injection (env)
  - Bulk injection with prefix (envFrom)
  - Bulk injection without prefix (envFrom)

#### Task 3.3: Create Environment Template
- [ ] Create `.env.example` with placeholder SSH key and known_hosts
- [ ] Add comments explaining format

#### Task 3.4: Create Documentation
- [ ] Create `README.md` with:
  - Overview of SSH authentication secrets
  - Setup instructions
  - Usage examples (all three patterns)
  - Troubleshooting guide
  - Security notes

#### Task 3.5: Test Example Project
- [ ] Run: `pnpm install`
- [ ] Run: `pnpm check-types` (must pass)
- [ ] Run: `pnpm kubricate generate` (must generate valid YAML)
- [ ] Manually inspect generated manifests

### Phase 4: Documentation and Quality (1-2 hours)

#### Task 4.1: Code Review Checklist
- [ ] Code follows existing provider patterns
- [ ] Error messages are clear and actionable
- [ ] No secrets logged in error messages
- [ ] All methods have JSDoc documentation
- [ ] TypeScript strict mode passes

#### Task 4.2: Build and Integration
- [ ] Build plugin package: `pnpm build --filter=@kubricate/plugin-kubernetes`
- [ ] Build all packages: `pnpm build`
- [ ] Run all tests: `pnpm test`
- [ ] Check linting: `pnpm lint:check`
- [ ] Check formatting: `pnpm format`

#### Task 4.3: Manual Testing
- [ ] Generate example manifests and inspect YAML
- [ ] Verify Base64 encoding is correct
- [ ] Test with only ssh-privatekey (no known_hosts)
- [ ] Test with both ssh-privatekey and known_hosts
- [ ] Verify error messages for all error scenarios
- [ ] Test with multiple containers (containerIndex)
- [ ] Test with custom targetPath

#### Task 4.4: Create Changeset
- [ ] Run: `pnpm changeset`
- [ ] Select: `@kubricate/plugin-kubernetes` (minor version)
- [ ] Write changeset describing new feature

---

## 4) Test Case from Developer

### Unit Test Strategy

#### Coverage Target
- **Minimum 35 tests** across 8 test suites
- **≥98% coverage** requirement
- **All branches** must be tested

#### Test Organization
Tests are organized by functionality:
1. **prepare()** - Secret manifest generation (8 tests)
2. **getInjectionPayload() - env** - Individual key injection (7 tests)
3. **getInjectionPayload() - envFrom** - Bulk injection (8 tests)
4. **Strategy Validation** - Mixed strategy detection (5 tests)
5. **getTargetPath()** - Path resolution (6 tests)
6. **getEffectIdentifier()** - Effect identification (2 tests)
7. **mergeSecrets()** - Merge behavior (3 tests)
8. **Metadata** - Provider metadata (4 tests)

### Integration Test Strategy

#### Test 1: Example Project Type Safety
```bash
cd examples/with-ssh-auth-secret
pnpm check-types
```
**Expected**: No TypeScript errors

#### Test 2: Manifest Generation
```bash
cd examples/with-ssh-auth-secret
pnpm kubricate generate
```
**Expected**:
- Exit code 0
- Manifests generated in `dist/`
- Valid YAML structure
- Correct Secret type: `kubernetes.io/ssh-auth`

#### Test 3: Package Build
```bash
pnpm build --filter=@kubricate/plugin-kubernetes
```
**Expected**:
- Exit code 0
- Compiled files in `dist/esm/`, `dist/cjs/`, `dist/dts/`
- No TypeScript errors

#### Test 4: Package Tests
```bash
pnpm test --filter=@kubricate/plugin-kubernetes
```
**Expected**:
- All 35+ tests pass
- Coverage ≥98%
- No flaky tests

### Manual Test Cases

#### Test Case 1: env Injection - ssh-privatekey Only
**Setup**:
```typescript
c.secrets('GIT_SSH_KEY')
  .forName('SSH_PRIVATE_KEY')
  .inject('env', { key: 'ssh-privatekey' });
```

**Expected Outcome**:
- Secret created with Base64-encoded `ssh-privatekey`
- Deployment has env var `SSH_PRIVATE_KEY` with secretKeyRef

**Verification**:
```bash
cat dist/manifests.yaml | grep -A 5 "SSH_PRIVATE_KEY"
```

#### Test Case 2: env Injection - Both Keys
**Setup**:
```typescript
c.secrets('GIT_SSH_KEY')
  .forName('SSH_PRIVATE_KEY')
  .inject('env', { key: 'ssh-privatekey' });

c.secrets('GIT_SSH_KEY')
  .forName('SSH_KNOWN_HOSTS')
  .inject('env', { key: 'known_hosts' });
```

**Expected Outcome**:
- Secret created with both keys Base64-encoded
- Deployment has two env vars with correct secretKeyRefs

#### Test Case 3: envFrom with Prefix
**Setup**:
```typescript
c.secrets('GIT_SSH_KEY')
  .inject('envFrom', { prefix: 'GIT_' });
```

**Expected Outcome**:
- Secret created with both keys
- Deployment has envFrom with `prefix: GIT_`
- Environment variables: `GIT_ssh-privatekey`, `GIT_known_hosts`

#### Test Case 4: envFrom without Prefix
**Setup**:
```typescript
c.secrets('GIT_SSH_KEY')
  .inject('envFrom');
```

**Expected Outcome**:
- Deployment has envFrom without prefix
- Environment variables: `ssh-privatekey`, `known_hosts`

#### Test Case 5: Error - Missing key Parameter
**Setup**:
```typescript
c.secrets('GIT_SSH_KEY')
  .forName('SSH_KEY')
  .inject('env');  // Missing { key: '...' }
```

**Expected Outcome**:
- Build fails with clear error message
- Error includes: "key' is required for env injection"

#### Test Case 6: Error - Invalid key
**Setup**:
```typescript
c.secrets('GIT_SSH_KEY')
  .forName('SSH_KEY')
  .inject('env', { key: 'username' });
```

**Expected Outcome**:
- Build fails with error: "Invalid key 'username'. Must be 'ssh-privatekey' or 'known_hosts'."

#### Test Case 7: Error - Mixed Strategies
**Setup**:
```typescript
c.secrets('GIT_SSH_KEY')
  .forName('KEY1')
  .inject('env', { key: 'ssh-privatekey' });

c.secrets('GIT_SSH_KEY')
  .inject('envFrom');
```

**Expected Outcome**:
- Build fails with error: "Mixed injection strategies are not allowed"
- Error lists detected strategies: "env, envFrom"

#### Test Case 8: Error - Multiple Prefixes
**Setup**:
```typescript
c.secrets('GIT_SSH_KEY')
  .inject('envFrom', { prefix: 'GIT_' });

c.secrets('GIT_SSH_KEY')
  .inject('envFrom', { prefix: 'SSH_' });
```

**Expected Outcome**:
- Build fails with error: "Multiple envFrom prefixes detected: GIT_, SSH_"

### Acceptance Criteria Verification

#### Pre-Merge Checklist
- [ ] All 35+ unit tests pass
- [ ] Test coverage ≥98%
- [ ] Example project builds without errors
- [ ] Example project generates valid manifests
- [ ] All manual test cases pass
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code follows existing patterns
- [ ] JSDoc documentation complete
- [ ] Changeset created
- [ ] No secrets in error messages
- [ ] Error messages are clear and actionable

#### Performance Benchmarks
- [ ] Validation is fail-fast (errors thrown immediately)
- [ ] No performance regression compared to BasicAuthSecretProvider
- [ ] Minimal memory allocation during payload generation

#### Security Checklist
- [ ] No secrets logged in error messages
- [ ] Base64 encoding correct
- [ ] No hardcoded credentials in tests
- [ ] Validation prevents injection attacks
- [ ] Example uses .env.example (not .env)

---

## Appendix: Reference Implementation

### Similar Implementation
This implementation closely follows `BasicAuthSecretProvider` (issue #140):
- **File**: `packages/plugin-kubernetes/src/BasicAuthSecretProvider.ts`
- **Tests**: `packages/plugin-kubernetes/src/BasicAuthSecretProvider.test.ts`
- **Pattern**: Nearly identical structure with different schema and keys

### Key Differences from BasicAuthSecretProvider

| Aspect | BasicAuthSecretProvider | SshAuthSecretProvider |
|--------|------------------------|----------------------|
| **Secret Type** | `kubernetes.io/basic-auth` | `kubernetes.io/ssh-auth` |
| **Required Keys** | `username`, `password` | `ssh-privatekey` |
| **Optional Keys** | None | `known_hosts` |
| **Key Validation** | Simple string check | Hyphenated key name handling |
| **Use Cases** | HTTP Basic Auth | Git, SSH tunneling |

### Estimated Timeline
- **Core Implementation**: 3-4 hours
- **Test Suite**: 4-5 hours
- **Example Project**: 2-3 hours
- **Documentation & QA**: 1-2 hours
- **Total**: **10-14 hours**
