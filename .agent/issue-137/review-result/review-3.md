# Snapshot Test Version Problem: Solutions & Recommendations

**Date:** 2025-11-19
**Issue:** Snapshot tests fail when package versions change
**Context:** Template metadata includes version numbers that cause snapshot mismatches on version bumps

## ⚠️ Critical Discovery: Missing Unit Test Coverage

**Before implementing any solution, we discovered that template metadata injection has NO unit test coverage!**

**Current Test Coverage:**
- ❌ **Unit Tests:** None for `stackTemplateMetadata` injection
- ✅ **E2E Tests:** Covered by `generate-with-template-metadata.test.ts` (with explicit assertions)
- ⚠️ **Snapshot Tests:** Contain metadata but break on version changes

This means **Option 1 (disabling metadata in snapshots) would remove the only "accidental" testing** of template metadata in production configuration, leaving only E2E assertion tests.

**Verdict:** We MUST add unit tests before implementing Option 1. Otherwise, we create a dangerous gap between test and production configurations.

---

## Problem Statement

When running snapshot tests in `tests/integration/generate-to-files.test.ts`, the generated YAML contains version annotations:

```yaml
annotations:
  kubricate.thaitype.dev/stack-template-version: 0.22.0
  kubricate.thaitype.dev/stack-template-core-version: 0.22.0
  kubricate.thaitype.dev/version: 0.22.0  # Already disabled
  kubricate.thaitype.dev/resource-hash: 6ccf...  # Already changing
  kubricate.thaitype.dev/managed-at: "2024-01-15T10:30:00.000Z"  # Already disabled
```

**Current Mitigation (Partial):**
```typescript
// tests/fixtures/shared-configs.ts
export const metadata = {
  injectManagedAt: false,     // ✅ Timestamp disabled
  injectVersion: false,        // ✅ Framework version disabled
  // ❌ Template versions still injected!
};
```

**Result:** Every version bump breaks all snapshot tests, requiring manual snapshot updates.

---

## Available Options

### Option 1: Add `injectTemplateMetadata` Configuration Flag ⭐ **RECOMMENDED**

**Description:** Add a new configuration option to disable template metadata injection in test fixtures.

**Implementation:**

#### Step 1: Update `ProjectMetadataOptions` Type

**File:** `packages/kubricate/src/types.ts`

```typescript
export interface ProjectMetadataOptions {
  inject?: boolean;
  injectManagedAt?: boolean;
  injectResourceHash?: boolean;
  injectVersion?: boolean;

  /**
   * Whether to inject stack template metadata annotations into each generated resource.
   *
   * When enabled, Kubricate will inject template-specific metadata such as:
   * - stack-template-version
   * - stack-template-core-version
   * - stack-template-author
   * - stack-template-repository
   * - stack-template-description
   * - stack-template-homepage
   *
   * Useful for tracking which template version was used to generate resources.
   * Disable this in snapshot tests to avoid failures when template versions change.
   *
   * Defaults to `true` if omitted.
   *
   * @default true
   */
  injectTemplateMetadata?: boolean;  // NEW
}
```

#### Step 2: Update Default Metadata in Renderer

**File:** `packages/kubricate/src/commands/generate/Renderer.ts`

```typescript
const defaultMetadata: Required<ProjectMetadataOptions> = {
  inject: true,
  injectManagedAt: true,
  injectResourceHash: true,
  injectVersion: true,
  injectTemplateMetadata: true,  // NEW: Default to true for production
};
```

#### Step 3: Update MetadataInjector Logic

**File:** `packages/kubricate/src/commands/MetadataInjector.ts`

```typescript
inject(resource: Record<string, unknown>): Record<string, unknown> {
  // ... existing code ...

  if (this.options.type === 'stack') {
    metadata.labels[LABELS.stackId] = this.options.stackId!;
    metadata.labels[LABELS.resourceId] = this.options.resourceId!;
    metadata.annotations[LABELS.stackTemplateName] = this.options.stackTemplateName!;

    // NEW: Only inject template metadata if enabled
    if (this.options.inject?.templateMetadata !== false) {  // NEW CONDITION
      const templateMeta = this.options.stackTemplateMetadata;
      if (templateMeta) {
        metadata.annotations[LABELS.stackTemplateCoreVersion] = templateMeta.coreVersion;
        metadata.annotations[LABELS.stackTemplateVersion] = templateMeta.version;

        if (templateMeta.author) {
          metadata.annotations[LABELS.stackTemplateAuthor] = templateMeta.author;
        }
        if (templateMeta.description) {
          metadata.annotations[LABELS.stackTemplateDescription] = templateMeta.description;
        }
        if (templateMeta.homepage) {
          metadata.annotations[LABELS.stackTemplateHomepage] = templateMeta.homepage;
        }
        if (templateMeta.repository) {
          metadata.annotations[LABELS.stackTemplateRepository] = templateMeta.repository;
        }
      }
    }
  }

  // ... rest of code ...
}
```

#### Step 4: Update MetadataInjector Constructor

**File:** `packages/kubricate/src/commands/MetadataInjector.ts`

Add `inject` options to `MetadataInjectorOptions`:

```typescript
export interface MetadataInjectorOptions {
  type: 'stack' | 'secret';
  kubricateVersion: string;
  managedAt?: string;

  // Stack fields
  stackId?: string;
  stackTemplateName?: string;
  resourceId?: string;
  stackTemplateMetadata?: { ... };

  // Secret fields
  secretManagerId?: string;
  secretManagerName?: string;

  inject?: {
    managedAt?: boolean;
    resourceHash?: boolean;
    version?: boolean;
    templateMetadata?: boolean;  // NEW
  };
}
```

#### Step 5: Update Renderer to Pass Configuration

**File:** `packages/kubricate/src/commands/generate/Renderer.ts`

```typescript
const injector = new MetadataInjector({
  type: 'stack',
  kubricateVersion: version,
  stackId,
  stackTemplateName,
  resourceId,
  stackTemplateMetadata: template?.metadata,
  inject: {
    managedAt: this.metadata.injectManagedAt ?? true,
    resourceHash: this.metadata.injectResourceHash ?? true,
    version: this.metadata.injectVersion ?? true,
    templateMetadata: this.metadata.injectTemplateMetadata ?? true,  // NEW
  },
});
```

#### Step 6: Update Test Fixtures

**File:** `tests/fixtures/shared-configs.ts`

```typescript
export const metadata = {
  injectManagedAt: false,
  injectVersion: false,
  injectTemplateMetadata: false,  // NEW: Disable for stable snapshots
};
```

**Pros:**
- ✅ Clean, declarative configuration
- ✅ Follows existing pattern (`injectVersion`, `injectManagedAt`)
- ✅ Non-breaking change (defaults to `true`)
- ✅ Self-documenting through type annotations
- ✅ Can be toggled per-fixture or globally
- ✅ Production manifests still have full metadata

**Cons:**
- ⚠️ Requires code changes in 5 files
- ⚠️ Adds another configuration option to maintain
- ⚠️ Test snapshots won't match production output exactly

**Effort:** Medium (2-3 hours)

---

### Option 2: Mock `metadata.gen.ts` in Tests

**Description:** Override the version imports in tests to return fixed values.

**Implementation:**

#### Approach 2A: Use Vitest Mock

**File:** `tests/integration/vitest.setup.ts` (new file)

```typescript
import { vi } from 'vitest';

// Mock @kubricate/stacks metadata
vi.mock('@kubricate/stacks/metadata.gen.js', () => ({
  metadata: {
    version: '0.0.0-test',
  },
}));

// Mock @kubricate/core metadata
vi.mock('@kubricate/core/metadata.gen.js', () => ({
  metadata: {
    version: '0.0.0-test',
  },
}));
```

**File:** `tests/vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    setupFiles: ['./integration/vitest.setup.ts'],
  },
});
```

#### Approach 2B: Create Test Fixtures with Fixed Versions

**File:** `tests/fixtures/test-metadata.gen.ts`

```typescript
export const metadata = {
  version: '0.0.0-test',
};
```

**File:** `tests/fixtures/shared-configs.ts`

```typescript
import { metadata as testMetadata } from './test-metadata.gen.js';
import { defineStackTemplate } from '@kubricate/core';

// Create test versions of templates with fixed metadata
export const testNamespaceTemplate = defineStackTemplate({
  name: '@kubricate/stacks/namespace',
  metadata: {
    version: testMetadata.version,
    author: 'Kubricate Team',
    repository: 'https://github.com/thaitype/kubricate',
  },
  build: namespaceTemplate.build,
});
```

**Pros:**
- ✅ No production code changes needed
- ✅ Snapshots are fully stable
- ✅ Test isolation (mocks don't affect production)

**Cons:**
- ⚠️ Mocking can hide real issues
- ⚠️ Vitest mocks can be fragile with ESM
- ⚠️ May need to duplicate template definitions
- ⚠️ Test snapshots don't match production output

**Effort:** Low-Medium (1-2 hours)

---

### Option 3: Normalize Snapshots (Custom Snapshot Serializer)

**Description:** Transform snapshots before comparison to replace version numbers with placeholders.

**Implementation:**

**File:** `tests/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    snapshotSerializers: ['./integration/snapshot-serializer.ts'],
  },
});
```

**File:** `tests/integration/snapshot-serializer.ts`

```typescript
export default {
  test(val: unknown) {
    return typeof val === 'string' && val.includes('kubricate.thaitype.dev');
  },

  serialize(val: string, config: any, indentation: string, depth: number, refs: any, printer: any) {
    // Replace version numbers with placeholders
    let normalized = val
      .replace(
        /kubricate\.thaitype\.dev\/stack-template-version: .*/g,
        'kubricate.thaitype.dev/stack-template-version: <version>'
      )
      .replace(
        /kubricate\.thaitype\.dev\/stack-template-core-version: .*/g,
        'kubricate.thaitype.dev/stack-template-core-version: <core-version>'
      )
      .replace(
        /kubricate\.thaitype\.dev\/resource-hash: .*/g,
        'kubricate.thaitype.dev/resource-hash: <hash>'
      );

    return normalized;
  },
};
```

**Pros:**
- ✅ No production code changes
- ✅ No test fixture changes
- ✅ Automatic normalization for all snapshots
- ✅ Can normalize other dynamic fields too (hashes)

**Cons:**
- ⚠️ Snapshots don't show actual values
- ⚠️ May hide real version-related bugs
- ⚠️ Serializer configuration can be complex
- ⚠️ Harder to debug when snapshots fail

**Effort:** Low (1 hour)

---

### Option 4: Use Inline Assertions Instead of Snapshots

**Description:** Replace snapshot tests with explicit assertions that ignore version fields.

**Implementation:**

**File:** `tests/integration/generate-to-files.test.ts`

```typescript
it('should generate expected files', async () => {
  const args = ['generate', '--root', fixturesDir];
  const { stdout, exitCode } = await executeKubricate(args, { reject: false });

  expect(exitCode).toBe(0);
  expect(stdout).toContain('Generating stacks');

  // Read and parse generated YAML
  const yamlContent = await fs.readFile(outputPath, 'utf-8');
  const docs = yamlContent.split(/^---$/m).filter(d => d.trim()).map(parseYaml);

  // Assert structure instead of exact snapshot
  for (const doc of docs) {
    expect(doc).toHaveProperty('metadata.labels');
    expect(doc.metadata.labels['kubricate.thaitype.dev']).toBe('true');
    expect(doc.metadata.annotations['kubricate.thaitype.dev/stack-template-name']).toBeTruthy();

    // Verify version is semver (don't check exact value)
    expect(doc.metadata.annotations['kubricate.thaitype.dev/stack-template-version']).toMatch(/^\d+\.\d+\.\d+/);
    expect(doc.metadata.annotations['kubricate.thaitype.dev/stack-template-core-version']).toMatch(/^\d+\.\d+\.\d+/);
  }
});
```

**Pros:**
- ✅ No production code changes
- ✅ Tests are more explicit about what matters
- ✅ Version changes don't break tests
- ✅ Better test documentation (clear assertions)

**Cons:**
- ⚠️ More verbose test code
- ⚠️ Misses subtle regression bugs that snapshots would catch
- ⚠️ Need to manually update tests for new fields
- ⚠️ Loses full structural validation

**Effort:** Medium (2-3 hours to refactor existing tests)

---

### Option 5: Hybrid Approach - Snapshot + Version Normalization

**Description:** Keep snapshots but normalize versions in a preprocessing step.

**Implementation:**

**File:** `tests/integration/generate-to-files.test.ts`

```typescript
import { normalizeVersions } from '../helpers/snapshot-helpers';

it('should generate expected files', async () => {
  const args = ['generate', '--root', fixturesDir];
  await executeKubricate(args, { reject: false });

  // Read file
  const content = await fs.readFile(outputPath, 'utf-8');

  // Normalize before snapshot
  const normalized = normalizeVersions(content);

  expect(normalized).toMatchSnapshot();
});
```

**File:** `tests/helpers/snapshot-helpers.ts`

```typescript
export function normalizeVersions(yaml: string): string {
  return yaml
    .replace(
      /kubricate\.thaitype\.dev\/stack-template-version: .*/g,
      'kubricate.thaitype.dev/stack-template-version: <VERSION>'
    )
    .replace(
      /kubricate\.thaitype\.dev\/stack-template-core-version: .*/g,
      'kubricate.thaitype.dev/stack-template-core-version: <CORE_VERSION>'
    )
    .replace(
      /kubricate\.thaitype\.dev\/resource-hash: .*/g,
      'kubricate.thaitype.dev/resource-hash: <HASH>'
    );
}
```

**Pros:**
- ✅ No production code changes
- ✅ Keep snapshot benefits for structure validation
- ✅ Simple helper function
- ✅ Easy to understand and maintain

**Cons:**
- ⚠️ Need to update all snapshot tests
- ⚠️ Snapshots don't show actual values
- ⚠️ Manual normalization per test

**Effort:** Low-Medium (1-2 hours)

---

## Comparison Matrix

| Option | Production Code Changes | Test Changes | Maintenance | Snapshot Stability | Version Visibility |
|--------|------------------------|--------------|-------------|-------------------|-------------------|
| 1. Config Flag | ✅ Medium | ✅ Minimal | ⚠️ Medium | ✅ Excellent | ❌ Hidden in tests |
| 2. Mock metadata.gen | ✅ None | ⚠️ Medium | ⚠️ Medium | ✅ Excellent | ❌ Hidden in tests |
| 3. Snapshot Serializer | ✅ None | ✅ Minimal | ✅ Low | ✅ Excellent | ❌ Hidden everywhere |
| 4. Inline Assertions | ✅ None | ❌ High | ⚠️ Medium | ✅ Excellent | ✅ Validated |
| 5. Hybrid Normalize | ✅ None | ⚠️ Medium | ✅ Low | ✅ Excellent | ❌ Hidden in tests |

---

## Recommendations

### Primary Recommendation: **Option 1 (Config Flag)** ⭐

**Why:**
- Follows existing patterns in the codebase (`injectVersion`, `injectManagedAt`)
- Clean, declarative configuration
- Self-documenting through TypeScript types
- Useful beyond just tests (e.g., for CI/CD environments)
- Non-breaking change

**When to use:**
- You want a production-grade solution
- You value consistency with existing patterns
- You're okay with moderate implementation effort
- You want fine-grained control over metadata injection

### Alternative Recommendation: **Option 5 (Hybrid Normalize)** 🥈

**Why:**
- No production code changes needed
- Quick to implement
- Easy to understand
- Keeps snapshot benefits

**When to use:**
- You want a quick fix
- You don't want to touch production code
- You're okay with manual normalization
- You value simplicity over configurability

### For Quick Fix: **Option 3 (Snapshot Serializer)** 🥉

**Why:**
- Minimal changes needed
- Automatic for all snapshots
- No test code modifications

**When to use:**
- You need to fix this immediately
- You don't want to change any test files
- You're comfortable with global snapshot transformations

---

## Implementation Checklist (Option 1 - Recommended)

### Phase 1: Core Implementation
- [ ] Update `ProjectMetadataOptions` interface in `packages/kubricate/src/types.ts`
- [ ] Update `defaultMetadata` in `packages/kubricate/src/commands/generate/Renderer.ts`
- [ ] Update `MetadataInjectorOptions.inject` in `packages/kubricate/src/commands/MetadataInjector.ts`
- [ ] Update `MetadataInjector.inject()` logic to check `inject?.templateMetadata`
- [ ] Update `Renderer.injectMetadata()` to pass `injectTemplateMetadata` option

### Phase 2: Unit Tests (CRITICAL - Must be done first!)
⚠️ **IMPORTANT:** Currently there are NO unit tests for template metadata injection!

Add unit tests to `packages/kubricate/src/commands/MetadataInjector.test.ts`:
- [ ] Test: should inject template metadata when stackTemplateMetadata is provided
- [ ] Test: should inject stack-template-version and stack-template-core-version
- [ ] Test: should inject optional fields (author, description, homepage, repository)
- [ ] Test: should omit optional fields when not provided
- [ ] Test: should NOT inject template metadata when inject.templateMetadata is false
- [ ] Test: should still inject stackTemplateName even when inject.templateMetadata is false

**Example test structure:**
```typescript
it('should inject stack template metadata when provided', () => {
  const injector = new MetadataInjector({
    type: 'stack',
    kubricateVersion: '1.0.0',
    stackId: 'test',
    stackTemplateName: '@kubricate/stacks/simple-app',
    resourceId: 'deployment',
    stackTemplateMetadata: {
      version: '1.5.0',
      coreVersion: '0.22.0',
      author: 'Platform Team',
      repository: 'https://github.com/acme/stacks',
    },
  });

  const resource = { kind: 'Deployment' };
  const result = injector.inject(resource);
  const annotations = (result.metadata as any).annotations;

  expect(annotations['kubricate.thaitype.dev/stack-template-version']).toBe('1.5.0');
  expect(annotations['kubricate.thaitype.dev/stack-template-core-version']).toBe('0.22.0');
  expect(annotations['kubricate.thaitype.dev/stack-template-author']).toBe('Platform Team');
  expect(annotations['kubricate.thaitype.dev/stack-template-repository']).toBe('https://github.com/acme/stacks');
});
```

### Phase 3: E2E Testing
- [ ] Verify E2E tests with assertions still work (`generate-with-template-metadata.test.ts`)
- [ ] Update `tests/fixtures/shared-configs.ts` to set `injectTemplateMetadata: false`
- [ ] Update snapshots with `pnpm vitest run -u`
- [ ] Verify all snapshot tests pass

### Phase 3: Documentation
- [ ] Add JSDoc examples showing how to disable in tests
- [ ] Update README with snapshot testing best practices
- [ ] Add migration note in CHANGELOG

### Phase 4: Validation
- [ ] Run full test suite: `pnpm test`
- [ ] Verify production builds still inject metadata by default
- [ ] Test with version bump scenario

---

## Migration Impact

### Breaking Changes
**None** - All options are backward compatible.

### Test Updates Required

**Option 1:**
```diff
// tests/fixtures/shared-configs.ts
export const metadata = {
  injectManagedAt: false,
  injectVersion: false,
+ injectTemplateMetadata: false,
};
```

Then run: `pnpm vitest run -u` to update snapshots once.

**Option 5:**
```diff
// tests/integration/generate-to-files.test.ts
+import { normalizeVersions } from '../helpers/snapshot-helpers';

it('should generate expected files', async () => {
  // ...
- await snapshotDirectory(outputFixtureDir, `${fixture}/${outputDir}`);
+ await snapshotDirectoryNormalized(outputFixtureDir, `${fixture}/${outputDir}`);
});
```

---

## Risk Assessment

| Risk | Option 1 | Option 2 | Option 3 | Option 4 | Option 5 |
|------|----------|----------|----------|----------|----------|
| Hidden bugs | Low | Medium | High | Low | Medium |
| Maintenance burden | Low | Medium | Low | Medium | Low |
| Implementation bugs | Medium | Low | Low | Low | Low |
| Test fragility | Low | Medium | Low | Low | Low |
| Production impact | Low | None | None | None | None |

---

## Next Steps

1. **Choose an approach** based on your priorities:
   - **Need production-grade solution**: Option 1
   - **Need quick fix**: Option 3 or 5
   - **Want explicit tests**: Option 4

2. **Implement the chosen option** following the checklist above

3. **Update snapshots** once after implementation

4. **Test version bump scenario**:
   ```bash
   # Change version in package.json
   pnpm changeset
   pnpm test  # Should pass without snapshot updates
   ```

5. **Document the decision** in ADR (Architecture Decision Record) if applicable

---

## Answer to Your Question

**Q: "Is Option 1 test good that reflect the purpose of using e2e? Is it right that there're another unit test (outside e2e) to cover stack template metadata testing?"**

**A:** You are absolutely correct! Option 1 alone is NOT sufficient because:

### Current State (Problematic)
```
Production:        injectTemplateMetadata = true  (metadata injected)
Snapshot Tests:    injectTemplateMetadata = true  (breaks on version bump)
Unit Tests:        ❌ NO COVERAGE
E2E Assertions:    ✅ Coverage exists
```

### After Option 1 Without Unit Tests (DANGEROUS)
```
Production:        injectTemplateMetadata = true  (metadata injected)
Snapshot Tests:    injectTemplateMetadata = false (stable snapshots)
Unit Tests:        ❌ NO COVERAGE
E2E Assertions:    ✅ Coverage exists
```

**Problem:** Production has metadata enabled, but we're only testing with it disabled! E2E assertion tests cover it, but we lack the granular unit test coverage.

### Correct Approach: Option 1 WITH Unit Tests
```
Production:        injectTemplateMetadata = true  (metadata injected)
Snapshot Tests:    injectTemplateMetadata = false (stable snapshots)
Unit Tests:        ✅ COMPREHENSIVE COVERAGE (tests all edge cases)
E2E Assertions:    ✅ Coverage exists (tests full integration)
```

**Testing Pyramid Should Be:**
1. **Unit Tests** (MetadataInjector.test.ts) - Test injection logic with all combinations
2. **E2E Assertion Tests** (generate-with-template-metadata.test.ts) - Verify full integration
3. **E2E Snapshot Tests** (generate-to-files.test.ts) - Verify overall structure stability

**Verdict:** Yes, you MUST have unit tests covering template metadata injection before implementing Option 1. The E2E tests alone are not sufficient because:
- Unit tests catch logic bugs at the source
- E2E tests are slower and test full integration
- Different purposes in testing pyramid

**Action Required:** Add 6-8 unit tests to `MetadataInjector.test.ts` before implementing Option 1.

---

## Questions & Answers

**Q: Will disabling template metadata in tests hide real bugs?**
A: Not if you have proper unit test coverage. The new E2E tests in `generate-with-template-metadata.test.ts` explicitly verify template metadata injection with assertions (not snapshots). Snapshot tests focus on overall structure, not version numbers. But you MUST add unit tests first!

**Q: Should we update snapshots on every version bump?**
A: No. Snapshots should be stable across version changes. Only update when actual structure changes.

**Q: Can we have different settings for different test files?**
A: Yes (Option 1). Each fixture can have its own metadata configuration.

**Q: What about resource-hash changes?**
A: Resource hash is already excluded from snapshots via `injectResourceHash: false` in shared-configs. If not, consider normalizing it too.

**Q: How do we test that metadata IS being injected correctly?**
A: Use the new E2E tests (`generate-with-template-metadata.test.ts`) which verify metadata with explicit assertions rather than snapshots.
