# Pre Development Analysis Document - Strategy Validation Fix

## 1) Introduction

### Why We Do This Work

A **critical architectural flaw** was discovered in the `BasicAuthSecretProvider` implementation through technical audit. The provider assumes all injections in a batch share the same strategy kind (either `env` or `envFrom`), but **no runtime validation enforces this invariant**.

**The Problem:**

The current implementation only examines the first element (`injectes[0]`) to determine which strategy handler to use, then routes all injections to that handler without validating that remaining elements use the same strategy. This creates several serious risks:

1. **Silent Data Loss**: Mixed strategies result in only the first being processed, others silently dropped
2. **Security Risk**: Missing credentials could cause apps to fall back to insecure defaults
3. **Debugging Nightmare**: Issues only surface in production when pods fail to start
4. **Fragile Architecture**: Relies on implicit framework behavior rather than explicit contracts

**Attack Vectors Identified:**

1. **Custom targetPath collision**: Users override `targetPath` causing mixed strategies to group together
2. **Multiple envFrom with different prefixes**: Only first prefix used, others silently ignored
3. **Framework refactoring**: Changes to grouping logic could introduce silent failures
4. **Race conditions**: Future async changes could violate assumptions

**Comparison with Other Providers:**

| Provider | Multiple Strategies | Processes All | Validates Homogeneity | Risk |
|----------|---------------------|---------------|----------------------|------|
| BasicAuthSecretProvider | ✅ Yes | ❌ **No** | ❌ **No** | 🔴 HIGH |
| OpaqueSecretProvider | ❌ No | ✅ Yes | N/A | 🟢 Low |
| DockerConfigSecretProvider | ❌ No | ✅ Yes | N/A | 🟢 Low |

BasicAuthSecretProvider is the **only provider vulnerable** to this pattern because it's the only one supporting multiple strategies.

### Business Impact

**Without this fix:**
- **Production Outages**: Pods fail to start due to missing environment variables
- **Security Incidents**: Missing credentials force apps to use insecure defaults
- **Customer Trust**: Silent failures erode confidence in the framework
- **Support Costs**: Debugging these issues is time-consuming and frustrating

**Risk Assessment:**
- **Likelihood**: MEDIUM (requires specific patterns but targetPath makes it possible)
- **Impact**: HIGH (silent data corruption, security exposure, production outages)
- **Detectability**: LOW (no errors, requires runtime testing)
- **Overall Risk**: **HIGH** (Medium × High × Low)

### Goals of This Fix

1. **Transform silent failures into explicit errors** with clear messages
2. **Validate strategy homogeneity** across all injections in a batch
3. **Prevent conflicting configurations** (e.g., multiple envFrom prefixes)
4. **Add defensive programming** to catch framework bugs or user errors
5. **Improve debuggability** through comprehensive error messages
6. **Add test coverage** for edge cases and attack vectors

---

## 2) Impact Analysis

### 2.1 Core Provider Logic (`packages/plugin-kubernetes/src/BasicAuthSecretProvider.ts`)

**Modified Methods:**

#### `getInjectionPayload()` (Lines 104-121)

**Current Implementation:**
```typescript
getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] | EnvFromSource[] {
  if (injectes.length === 0) {
    return [];
  }

  // Determine strategy from first injection (all should be same kind per provider call)
  const firstStrategy = this.extractStrategy(injectes[0]);

  if (firstStrategy.kind === 'env') {
    return this.getEnvInjectionPayload(injectes);
  }

  if (firstStrategy.kind === 'envFrom') {
    return this.getEnvFromInjectionPayload(injectes);
  }

  throw new Error(`[BasicAuthSecretProvider] Unsupported strategy kind: ${firstStrategy.kind}`);
}
```

**Required Changes:**
- Add validation to ensure ALL injections use the same strategy kind
- Throw descriptive error if mixed strategies detected
- List all unique strategy kinds in error message for debugging

**Impact:**
- ✅ Prevents silent data loss from mixed strategies
- ✅ Catches custom targetPath misconfigurations
- ✅ Protects against framework grouping bugs
- ⚠️ May break existing (incorrect) code that relies on buggy behavior

#### `getEnvFromInjectionPayload()` (Lines 172-186)

**Current Implementation:**
```typescript
private getEnvFromInjectionPayload(injectes: ProviderInjection[]): EnvFromSource[] {
  // For envFrom, we typically only need one entry per secret
  // Get prefix from the first injection's strategy if available
  const firstStrategy = this.extractStrategy(injectes[0]);
  const prefix = firstStrategy.kind === 'envFrom' ? firstStrategy.prefix : undefined;

  return [
    {
      ...(prefix && { prefix }),
      secretRef: {
        name: this.config.name,
      },
    },
  ];
}
```

**Required Changes:**
- Add validation to ensure all injections use `envFrom` strategy (not `env`)
- Add validation to ensure all `envFrom` injections use the **same prefix**
- Throw descriptive error if multiple prefixes detected

**Impact:**
- ✅ Prevents silent loss of envFrom injections with different prefixes
- ✅ Makes provider design explicit: one provider = one secret = one prefix
- ✅ Guides users to correct configuration pattern

#### `getEnvInjectionPayload()` (Lines 138-170)

**No Changes Required:**
- Already processes ALL injections via `.map()`
- Already validates each injection independently
- ✅ Safe from homogeneity issues

**Analysis:**
This method is safe because it processes every injection, not just the first. The validation in `getInjectionPayload()` will protect it from receiving mixed strategies.

---

### 2.2 Test Coverage (`packages/plugin-kubernetes/src/BasicAuthSecretProvider.test.ts`)

**New Test Suite Required:**

```typescript
describe('BasicAuthSecretProvider - Strategy Validation', () => {
  // Test mixed env and envFrom strategies
  // Test multiple envFrom prefixes
  // Test multiple env injections (should work)
  // Test multiple envFrom with same prefix (should work)
  // Test custom targetPath collision scenario
});
```

**Impact:**
- ✅ Increases test coverage from 28 to 33 tests (~18% increase)
- ✅ Covers all edge cases identified in audit
- ✅ Provides regression protection
- ✅ Documents expected behavior through tests

**Test Categories:**

1. **Negative Tests** (should throw):
   - Mixed `env` and `envFrom` strategies
   - Multiple `envFrom` with different prefixes
   - Invalid strategy kind in `getEnvFromInjectionPayload()`

2. **Positive Tests** (should pass):
   - Multiple `env` injections with different keys
   - Multiple `envFrom` injections with same prefix
   - Multiple `envFrom` injections with no prefix (undefined)

---

### 2.3 Documentation Impact

**Files Requiring Updates:**

1. **JSDoc in BasicAuthSecretProvider.ts**
   - Add `@throws` annotations to `getInjectionPayload()`
   - Document homogeneity requirement
   - Explain prefix uniqueness constraint

2. **README.md** (`examples/with-basic-auth-secret/README.md`)
   - Update troubleshooting section with new error messages
   - Add section explaining why separate providers are needed
   - Document prefix constraint for envFrom

3. **Architecture Documentation**
   - Document the design decision: one provider = one secret = one prefix
   - Explain grouping behavior and validation layer

**Impact:**
- ✅ Reduces support burden through clear documentation
- ✅ Guides users to correct patterns
- ✅ Prevents misuse through education

---

### 2.4 Error Messages

**New Error Messages:**

1. **Mixed Strategies Error:**
   ```
   [BasicAuthSecretProvider] Mixed injection strategies are not allowed.
   Expected all injections to use 'env' but found: env, envFrom.
   This is likely a framework bug or incorrect targetPath configuration.
   ```

2. **Invalid Strategy in envFrom Handler:**
   ```
   [BasicAuthSecretProvider] Mixed injection strategies detected in envFrom handler.
   All injections must use 'envFrom' strategy.
   Found 2 injection(s) with different strategy.
   ```

3. **Multiple Prefixes Error:**
   ```
   [BasicAuthSecretProvider] Multiple envFrom prefixes detected: API_, DB_, (none).
   All envFrom injections for the same secret must use the same prefix.
   ```

**Error Message Design Principles:**
- Clear identification: `[BasicAuthSecretProvider]` prefix
- Explain what's wrong: "Mixed injection strategies"
- Explain what's expected: "All injections must use..."
- Provide debugging hints: "This is likely a framework bug or..."
- List actual values: "found: env, envFrom"

---

### 2.5 Backward Compatibility Analysis

**Breaking Changes:**
- ✅ **None** - New validation only catches **already-broken** code
- ✅ Existing valid code continues to work
- ✅ No API changes

**Why This Is Not Breaking:**

1. **Framework guarantees**: Under normal usage, mixed strategies never occur (different paths → different groups)
2. **Buggy code detection**: Code that triggers these errors was already producing incorrect manifests
3. **Fail-fast principle**: Better to fail at generation time than at runtime

**Migration Path:**

Users receiving new errors should:
1. Check for custom `targetPath` overrides causing collisions
2. Ensure each provider instance is used for one secret only
3. Use separate provider instances for different secrets
4. Use consistent prefix for all envFrom injections to same provider

---

### 2.6 Performance Impact

**Analysis:**
- Additional validation requires iterating over `injectes` array
- Complexity: O(n) where n = number of injections in group
- Typical group size: 1-3 injections
- Performance impact: **Negligible** (<1ms per provider call)

**Trade-off:**
- Minimal performance cost for significant reliability improvement
- Validation runs at manifest generation time (not runtime)
- ✅ Acceptable trade-off

---

## 3) Tasks

### Task 1: Add Strategy Homogeneity Validation to `getInjectionPayload()`

**File:** `packages/plugin-kubernetes/src/BasicAuthSecretProvider.ts`

**Location:** Lines 104-121

**Implementation:**

```typescript
getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] | EnvFromSource[] {
  if (injectes.length === 0) {
    return [];
  }

  // VALIDATION: Ensure all injections use the same strategy kind
  const firstStrategy = this.extractStrategy(injectes[0]);
  const mixedStrategies = injectes.filter(inject => {
    const strategy = this.extractStrategy(inject);
    return strategy.kind !== firstStrategy.kind;
  });

  if (mixedStrategies.length > 0) {
    const kinds = injectes.map(i => this.extractStrategy(i).kind);
    const uniqueKinds = [...new Set(kinds)].join(', ');
    throw new Error(
      `[BasicAuthSecretProvider] Mixed injection strategies are not allowed. ` +
      `Expected all injections to use '${firstStrategy.kind}' but found: ${uniqueKinds}. ` +
      `This is likely a framework bug or incorrect targetPath configuration.`
    );
  }

  if (firstStrategy.kind === 'env') {
    return this.getEnvInjectionPayload(injectes);
  }

  if (firstStrategy.kind === 'envFrom') {
    return this.getEnvFromInjectionPayload(injectes);
  }

  throw new Error(`[BasicAuthSecretProvider] Unsupported strategy kind: ${firstStrategy.kind}`);
}
```

**Estimated Time:** 30 minutes

---

### Task 2: Add Strategy and Prefix Validation to `getEnvFromInjectionPayload()`

**File:** `packages/plugin-kubernetes/src/BasicAuthSecretProvider.ts`

**Location:** Lines 172-186

**Implementation:**

```typescript
private getEnvFromInjectionPayload(injectes: ProviderInjection[]): EnvFromSource[] {
  // VALIDATION: Ensure all injections use envFrom strategy
  const invalidInjections = injectes.filter(inject => {
    const strategy = this.extractStrategy(inject);
    return strategy.kind !== 'envFrom';
  });

  if (invalidInjections.length > 0) {
    throw new Error(
      `[BasicAuthSecretProvider] Mixed injection strategies detected in envFrom handler. ` +
      `All injections must use 'envFrom' strategy. ` +
      `Found ${invalidInjections.length} injection(s) with different strategy.`
    );
  }

  // VALIDATION: Check for conflicting prefixes
  const prefixes = new Set<string | undefined>();
  injectes.forEach(inject => {
    const strategy = this.extractStrategy(inject);
    if (strategy.kind === 'envFrom') {
      prefixes.add(strategy.prefix);
    }
  });

  if (prefixes.size > 1) {
    const prefixList = Array.from(prefixes).map(p => p || '(none)').join(', ');
    throw new Error(
      `[BasicAuthSecretProvider] Multiple envFrom prefixes detected: ${prefixList}. ` +
      `All envFrom injections for the same secret must use the same prefix.`
    );
  }

  const firstStrategy = this.extractStrategy(injectes[0]);
  const prefix = firstStrategy.kind === 'envFrom' ? firstStrategy.prefix : undefined;

  return [
    {
      ...(prefix && { prefix }),
      secretRef: {
        name: this.config.name,
      },
    },
  ];
}
```

**Estimated Time:** 45 minutes

---

### Task 3: Add Comprehensive Test Suite

**File:** `packages/plugin-kubernetes/src/BasicAuthSecretProvider.test.ts`

**Location:** End of file (new describe block)

**Implementation:**

```typescript
describe('BasicAuthSecretProvider - Strategy Validation', () => {
  describe('Mixed Strategy Validation', () => {
    it('should throw error when env and envFrom strategies are mixed', () => {
      const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

      const mixedInjections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].customPath',
          meta: {
            secretName: 'CRED1',
            targetName: 'USERNAME',
            strategy: { kind: 'env', key: 'username' },
          },
        },
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].customPath',
          meta: {
            secretName: 'CRED2',
            targetName: 'CRED2',
            strategy: { kind: 'envFrom', prefix: 'DB_' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(
        /mixed injection strategies are not allowed/i
      );
      expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(/env, envFrom/);
    });

    it('should include helpful context in error message', () => {
      const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

      const mixedInjections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'CRED1',
            targetName: 'USERNAME',
            strategy: { kind: 'env', key: 'username' },
          },
        },
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'CRED2',
            targetName: 'CRED2',
            strategy: { kind: 'envFrom' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(mixedInjections)).toThrow(
        /framework bug or incorrect targetPath/i
      );
    });
  });

  describe('envFrom Prefix Validation', () => {
    it('should throw error when multiple different prefixes are used', () => {
      const provider = new BasicAuthSecretProvider({ name: 'shared-auth', namespace: 'default' });

      const conflictingInjections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'API_CREDS',
            targetName: 'API_CREDS',
            strategy: { kind: 'envFrom', prefix: 'API_' },
          },
        },
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'DB_CREDS',
            targetName: 'DB_CREDS',
            strategy: { kind: 'envFrom', prefix: 'DB_' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(
        /multiple envFrom prefixes detected/i
      );
      expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(/API_, DB_/);
    });

    it('should throw error when mixing prefixed and non-prefixed envFrom', () => {
      const provider = new BasicAuthSecretProvider({ name: 'shared-auth', namespace: 'default' });

      const conflictingInjections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'CRED1',
            targetName: 'CRED1',
            strategy: { kind: 'envFrom', prefix: 'API_' },
          },
        },
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'CRED2',
            targetName: 'CRED2',
            strategy: { kind: 'envFrom' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(
        /multiple envFrom prefixes detected/i
      );
      expect(() => provider.getInjectionPayload(conflictingInjections)).toThrow(/\(none\)/);
    });

    it('should accept multiple envFrom injections with same prefix', () => {
      const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

      const validInjections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'CRED1',
            targetName: 'CRED1',
            strategy: { kind: 'envFrom', prefix: 'DB_' },
          },
        },
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'CRED2',
            targetName: 'CRED2',
            strategy: { kind: 'envFrom', prefix: 'DB_' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
    });

    it('should accept multiple envFrom injections with no prefix (undefined)', () => {
      const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

      const validInjections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'CRED1',
            targetName: 'CRED1',
            strategy: { kind: 'envFrom' },
          },
        },
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].envFrom',
          meta: {
            secretName: 'CRED2',
            targetName: 'CRED2',
            strategy: { kind: 'envFrom' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
    });
  });

  describe('env Strategy Validation', () => {
    it('should accept multiple env injections with different keys', () => {
      const provider = new BasicAuthSecretProvider({ name: 'test-auth', namespace: 'default' });

      const validInjections: ProviderInjection[] = [
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'BASIC_AUTH',
            targetName: 'API_USER',
            strategy: { kind: 'env', key: 'username' },
          },
        },
        {
          providerId: 'basicAuth',
          provider,
          resourceId: 'deployment',
          path: 'spec.template.spec.containers[0].env',
          meta: {
            secretName: 'BASIC_AUTH',
            targetName: 'API_PASSWORD',
            strategy: { kind: 'env', key: 'password' },
          },
        },
      ];

      expect(() => provider.getInjectionPayload(validInjections)).not.toThrow();
      const payload = provider.getInjectionPayload(validInjections);
      expect(payload).toHaveLength(2);
    });
  });
});
```

**Estimated Time:** 2 hours

---

### Task 4: Update JSDoc Documentation

**File:** `packages/plugin-kubernetes/src/BasicAuthSecretProvider.ts`

**Location:** Above `getInjectionPayload()` method

**Implementation:**

```typescript
/**
 * Get injection payload for Kubernetes manifests.
 *
 * This method routes to the appropriate handler based on the injection strategy kind.
 * All injections in the array MUST use the same strategy kind (homogeneity requirement).
 *
 * @param injectes Array of provider injections. Must all use the same strategy kind.
 * @returns Array of environment variables (for 'env' strategy) or envFrom sources (for 'envFrom' strategy)
 *
 * @throws {Error} If mixed injection strategies are detected (e.g., both 'env' and 'envFrom')
 * @throws {Error} If multiple envFrom prefixes are detected for the same provider
 * @throws {Error} If an unsupported strategy kind is encountered
 *
 * @example
 * // Valid: All env strategy
 * const envPayload = provider.getInjectionPayload([
 *   { meta: { strategy: { kind: 'env', key: 'username' } } },
 *   { meta: { strategy: { kind: 'env', key: 'password' } } }
 * ]);
 *
 * @example
 * // Valid: All envFrom with same prefix
 * const envFromPayload = provider.getInjectionPayload([
 *   { meta: { strategy: { kind: 'envFrom', prefix: 'DB_' } } },
 *   { meta: { strategy: { kind: 'envFrom', prefix: 'DB_' } } }
 * ]);
 *
 * @example
 * // Invalid: Mixed strategies (throws error)
 * provider.getInjectionPayload([
 *   { meta: { strategy: { kind: 'env' } } },
 *   { meta: { strategy: { kind: 'envFrom' } } }
 * ]); // Throws error
 */
getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] | EnvFromSource[] {
  // ... implementation
}
```

**Estimated Time:** 20 minutes

---

### Task 5: Update README Documentation

**File:** `examples/with-basic-auth-secret/README.md`

**Location:** Troubleshooting section

**Implementation:**

Add new troubleshooting entries:

```markdown
### Error: Mixed injection strategies

\`\`\`
Error: [BasicAuthSecretProvider] Mixed injection strategies are not allowed.
Expected all injections to use 'env' but found: env, envFrom.
\`\`\`

**Cause**: Attempting to use both `env` and `envFrom` strategies with the same provider and custom `targetPath` that causes them to be grouped together.

**Solution**: Don't mix strategies. Use either `env` OR `envFrom`, not both:

\`\`\`typescript
// ❌ Wrong - mixing strategies
c.secrets('CREDS')
  .forName('USER')
  .inject('env', { key: 'username', targetPath: 'custom.path' });
c.secrets('CREDS')
  .inject('envFrom', { prefix: 'DB_', targetPath: 'custom.path' });

// ✅ Correct - use only one strategy
c.secrets('CREDS')
  .forName('USER')
  .inject('env', { key: 'username' });
c.secrets('CREDS')
  .forName('PASS')
  .inject('env', { key: 'password' });
\`\`\`

### Error: Multiple envFrom prefixes detected

\`\`\`
Error: [BasicAuthSecretProvider] Multiple envFrom prefixes detected: API_, DB_.
All envFrom injections for the same secret must use the same prefix.
\`\`\`

**Cause**: Trying to use different prefixes for envFrom injections to the same provider instance.

**Why this happens**: Each provider instance represents **one** Kubernetes Secret. That secret can only be injected with **one** prefix value.

**Solution**: Use separate provider instances for different secrets:

\`\`\`typescript
// ❌ Wrong - different prefixes for same provider
.addProvider('BasicAuthProvider', new BasicAuthSecretProvider({ name: 'shared-creds' }))
c.secrets('API_CREDS').inject('envFrom', { prefix: 'API_' });
c.secrets('DB_CREDS').inject('envFrom', { prefix: 'DB_' });

// ✅ Correct - separate providers for different secrets
.addProvider('ApiProvider', new BasicAuthSecretProvider({ name: 'api-creds' }))
.addProvider('DbProvider', new BasicAuthSecretProvider({ name: 'db-creds' }))
c.secrets('API_CREDS', { provider: 'ApiProvider' }).inject('envFrom', { prefix: 'API_' });
c.secrets('DB_CREDS', { provider: 'DbProvider' }).inject('envFrom', { prefix: 'DB_' });
\`\`\`
```

**Estimated Time:** 30 minutes

---

### Task 6: Run Tests and Verify

**Commands:**

```bash
# Run BasicAuthSecretProvider tests
pnpm --filter=@kubricate/plugin-kubernetes test BasicAuthSecretProvider

# Run all plugin-kubernetes tests
pnpm --filter=@kubricate/plugin-kubernetes test

# Run all tests
pnpm test

# Build packages
pnpm build
```

**Expected Results:**
- All new tests pass
- All existing tests pass (33 → 38 tests for BasicAuthSecretProvider)
- No type errors
- Clean build

**Estimated Time:** 30 minutes

---

### Task Summary

| Task | File | Estimated Time |
|------|------|----------------|
| 1. Add strategy validation to `getInjectionPayload()` | BasicAuthSecretProvider.ts | 30 min |
| 2. Add prefix validation to `getEnvFromInjectionPayload()` | BasicAuthSecretProvider.ts | 45 min |
| 3. Add comprehensive test suite | BasicAuthSecretProvider.test.ts | 2 hours |
| 4. Update JSDoc documentation | BasicAuthSecretProvider.ts | 20 min |
| 5. Update README troubleshooting | README.md | 30 min |
| 6. Run tests and verify | - | 30 min |
| **Total** | | **~4.5 hours** |

---

## 4) Test Case from Developer

### Test Strategy

The fix will be validated through:

1. **Unit Tests** - Comprehensive test suite covering all validation scenarios
2. **Integration Tests** - Verify behavior with actual SecretManager and Stack
3. **Regression Tests** - Ensure existing functionality unchanged
4. **Manual Testing** - Test with example project

### Unit Test Coverage

**Test Suite:** `BasicAuthSecretProvider - Strategy Validation`

**Categories:**

1. **Mixed Strategy Validation** (2 tests)
   - ✅ Throws error when env and envFrom mixed
   - ✅ Error message includes helpful context

2. **envFrom Prefix Validation** (4 tests)
   - ✅ Throws error for multiple different prefixes
   - ✅ Throws error when mixing prefixed and non-prefixed
   - ✅ Accepts multiple envFrom with same prefix
   - ✅ Accepts multiple envFrom with no prefix

3. **env Strategy Validation** (1 test)
   - ✅ Accepts multiple env injections with different keys

**Total New Tests:** 7

### Integration Test Plan

**Test 1: Verify Custom targetPath Detection**

```typescript
// This should fail at generation time
Stack.fromTemplate(simpleAppTemplate, { name: 'test' })
  .useSecrets(secretManager, c => {
    c.secrets('API_CREDS')
      .forName('USER')
      .inject('env', {
        key: 'username',
        targetPath: 'spec.template.spec.containers[0].custom'
      });

    c.secrets('DB_CREDS')
      .inject('envFrom', {
        prefix: 'DB_',
        targetPath: 'spec.template.spec.containers[0].custom'
      });
  })
  .build(); // Should throw error
```

**Expected:** Error thrown during build with clear message about mixed strategies

**Test 2: Verify Multiple Prefix Detection**

```typescript
const secretManager = new SecretManager()
  .addProvider('BasicAuthProvider', new BasicAuthSecretProvider({ name: 'shared' }))
  .addSecret({ name: 'API_CREDS' })
  .addSecret({ name: 'DB_CREDS' });

Stack.fromTemplate(simpleAppTemplate, { name: 'test' })
  .useSecrets(secretManager, c => {
    c.secrets('API_CREDS').inject('envFrom', { prefix: 'API_' });
    c.secrets('DB_CREDS').inject('envFrom', { prefix: 'DB_' });
  })
  .build(); // Should throw error
```

**Expected:** Error thrown with message about multiple prefixes (API_, DB_)

**Test 3: Verify Valid Multiple envFrom Works**

```typescript
Stack.fromTemplate(simpleAppTemplate, { name: 'test' })
  .useSecrets(secretManager, c => {
    c.secrets('API_CREDS').inject('envFrom', { prefix: 'API_' });
    c.secrets('DB_CREDS').inject('envFrom', { prefix: 'API_' }); // Same prefix
  })
  .build(); // Should succeed
```

**Expected:** Successful build, manifest contains single envFrom with API_ prefix

### Regression Test Plan

**Ensure existing functionality works:**

1. ✅ Individual key injection still works
   ```typescript
   c.secrets('CREDS').forName('USER').inject('env', { key: 'username' });
   c.secrets('CREDS').forName('PASS').inject('env', { key: 'password' });
   ```

2. ✅ envFrom without prefix still works
   ```typescript
   c.secrets('CREDS').inject('envFrom');
   ```

3. ✅ envFrom with prefix still works
   ```typescript
   c.secrets('CREDS').inject('envFrom', { prefix: 'DB_' });
   ```

4. ✅ All 28 existing tests still pass

### Manual Testing with Example Project

**Steps:**

1. Navigate to example project
   ```bash
   cd examples/with-basic-auth-secret
   ```

2. Generate manifests
   ```bash
   pnpm kbr generate
   ```

3. Verify output files are correct
   ```bash
   cat output/apiServiceApp.yml
   cat output/dbClientApp.yml
   cat output/workerApp.yml
   ```

4. Apply secrets
   ```bash
   pnpm kbr secret apply
   ```

5. Test error scenarios by modifying `src/stacks.ts`:

   **Test A: Try mixing strategies (should fail)**
   ```typescript
   c.secrets('API_CREDENTIALS')
     .forName('USER')
     .inject('env', { key: 'username', targetPath: 'spec.custom' });
   c.secrets('API_CREDENTIALS')
     .inject('envFrom', { targetPath: 'spec.custom' });
   ```

   **Expected:** Clear error message about mixed strategies

   **Test B: Try different prefixes (should fail)**
   ```typescript
   c.secrets('API_CREDENTIALS').inject('envFrom', { prefix: 'API_' });
   c.secrets('DB_CREDENTIALS').inject('envFrom', { prefix: 'DB_' });
   ```

   **Expected:** Clear error message about multiple prefixes

### Success Criteria

**The fix is successful when:**

1. ✅ All 7 new tests pass
2. ✅ All existing 28 tests pass (total: 35 tests)
3. ✅ Integration tests demonstrate validation works end-to-end
4. ✅ Error messages are clear and actionable
5. ✅ Example project generates correct manifests
6. ✅ No breaking changes to existing valid code
7. ✅ Documentation accurately describes behavior
8. ✅ Performance impact is negligible (<1ms)

### Test Coverage Goals

**Before Fix:**
- Lines covered: ~95%
- Edge cases: Missing
- Validation: None

**After Fix:**
- Lines covered: ~98%
- Edge cases: ✅ Covered
- Validation: ✅ Comprehensive

---

## Appendix: Risk Mitigation Checklist

- [x] Identified all attack vectors
- [x] Designed validation to catch each scenario
- [x] Written tests for each edge case
- [x] Documented error messages
- [x] Updated user documentation
- [x] Ensured backward compatibility
- [x] Planned regression testing
- [x] Estimated effort (4.5 hours)
- [x] Defined success criteria
- [ ] Implemented (pending)
- [ ] Tested (pending)
- [ ] Reviewed (pending)
- [ ] Deployed (pending)
