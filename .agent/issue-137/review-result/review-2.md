# PR Review: Stack Template Metadata Enhancement (Issue #137)

**Date:** 2025-11-19
**Reviewer:** Claude Code (Senior PR Reviewer)
**Branch:** main.issue-137 → main
**Commits:** 19 commits implementing stack template metadata enhancements

---

## Executive Summary

**APPROVAL STATUS:** Request Changes (Minor Issues)

**Overall Assessment:** The implementation successfully addresses the core requirements of issue #137, introducing stack template metadata capabilities with strong adherence to the design specification. The architecture is sound with proper separation of concerns between @kubricate/core and kubricate packages. However, there are minor test coverage gaps and a few edge cases that should be addressed before merging.

**Confidence Level:** High - Full codebase review completed with cross-reference to requirement and design documents.

---

## 1. Requirements Coverage

### FR-1: Update metadata key `stack-name` to `stack-template-name`
**Status:** ✅ FULLY IMPLEMENTED

**Evidence:**
- `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/commands/constants.ts:14`
  ```typescript
  stackTemplateName: FRAMEWORK_LABEL + '/stack-template-name',
  ```
- `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/commands/MetadataInjector.ts:62`
  ```typescript
  metadata.annotations[LABELS.stackTemplateName] = this.options.stackTemplateName!;
  ```
- Backward compatibility maintained with deprecated `stackName` field (line 65)

### FR-2-FR-5: Optional metadata fields (org, docs-url, author, template version)
**Status:** ✅ IMPLEMENTED (with design change)

**Evidence:**
- Organization handled via npm-style scoping in name (`@org/template`)
- Fields implemented: `author`, `description`, `homepage`, `repository`, `version`
- Design improvement: `homepage` instead of `docs-url` (follows package.json conventions)
- `/Users/thada/gits/thaitype/kubricate/packages/core/src/defineStackTemplate.ts:8-37`

**Design Decision:** The implementation correctly follows design-v2.md by:
- Using `homepage` instead of `docsUrl` (package.json convention)
- Using `repository` instead of separate `org` field
- Encoding organization in the name using `@orgName/templateName` pattern

### FR-6: Backward compatibility
**Status:** ✅ FULLY IMPLEMENTED

**Evidence:**
- Old `stack-name` annotation still injected alongside new `stack-template-name`
- `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/commands/MetadataInjector.ts:64-65`
  ```typescript
  // NEW: Use stack-template-name instead of stack-name
  metadata.annotations[LABELS.stackTemplateName] = this.options.stackTemplateName!;

  // DEPRECATED: Keep old stack-name for backward compatibility (will be removed in v1.0)
  metadata.annotations[LABELS.stackName] = this.options.stackTemplateName!;
  ```
- Deprecation notice in constants: `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/commands/constants.ts:22-27`

### FR-7: Stack Templates can define metadata through configuration API
**Status:** ✅ FULLY IMPLEMENTED

**Evidence:**
- Two overload signatures provided:
  1. Legacy: `defineStackTemplate(name, build)`
  2. New: `defineStackTemplate({ name, metadata, build })`
- `/Users/thada/gits/thaitype/kubricate/packages/core/src/defineStackTemplate.ts:125-150`
- Real usage example in stacks package: `/Users/thada/gits/thaitype/kubricate/packages/stacks/src/simpleAppTemplate.ts:21-27`

---

## 2. Design Implementation Analysis

### Design Alignment: Excellent (95%)

#### ✅ coreVersion Injection (criticize-report-4.md)
**Implementation:** Perfect alignment
- Generated file: `/Users/thada/gits/thaitype/kubricate/packages/core/src/metadata.gen.ts`
- Automatic injection in `defineStackTemplate`: line 165
- Users cannot override `coreVersion` (enforced by type system)

#### ✅ metadata.gen.ts Pattern
**Implementation:** Fully implemented
- CLI command: `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/commands/GenerateMetadataCommand.ts`
- Integration test: `/Users/thada/gits/thaitype/kubricate/tests/integration/generate-metadata.test.ts`
- Used in both @kubricate/core and @kubricate/stacks packages

#### ✅ Type Definitions
**Implementation:** Correct separation
- `StackTemplateMetadataInput` (user-facing): lines 8-37
- `StackTemplateMetadata` (internal with coreVersion): lines 39-49
- `StackTemplateConfig` (descriptor pattern): lines 55-86
- No way for users to override `coreVersion`

#### ✅ defineStackTemplate Overloads
**Implementation:** Backward-compatible and clean
- Config object form (preferred): line 125
- Legacy string form (supported): line 147
- Implementation correctly handles both: lines 155-185

#### ✅ Validation
**Implementation:** Proper separation of concerns
- Validation lives in kubricate package (not core): `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/internal/utils.ts`
- Comprehensive test coverage: `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/internal/validateStackTemplateName.test.ts` (175 lines)
- Validation called in Renderer: `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/commands/generate/Renderer.ts:59`

#### ⚠️ Minor Gap: Type-level validation
**Issue:** Runtime validation exists but TypeScript type `StackTemplateName<S>` is defined but not preventing invalid names at compile-time effectively.

**Evidence:** `/Users/thada/gits/thaitype/kubricate/packages/core/src/StackTemplateName.type.ts:94-95`
```typescript
export type InvalidTemplateNameError = 'Invalid Stack Template Name: ...';
export type StackTemplateName<S extends string> = IsStackTemplateName<S> extends true ? S : InvalidTemplateNameError;
```

**Impact:** Medium - Type error appears but doesn't fail compilation in all contexts
**Recommendation:** This is acceptable for v0.23. Consider stricter enforcement or better DX messaging in future iterations.

---

## 3. Acceptance Criteria Assessment

### AC-1: `stack-name` → `stack-template-name` annotation rename
**Status:** ✅ PASS
- Both annotations injected for backward compatibility
- New annotation is primary: `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/commands/MetadataInjector.ts:62`

### AC-2: Stack template name reflects actual template class name
**Status:** ✅ PASS
- Template name comes from `StackTemplate.name` field
- Validation ensures correct format
- Examples use kebab-case consistently

### AC-3: Templates can define optional metadata
**Status:** ✅ PASS
- `version`, `author`, `description`, `homepage`, `repository` supported
- Example: `/Users/thada/gits/thaitype/kubricate/packages/stacks/src/simpleAppTemplate.ts:23-26`

### AC-4: Optional metadata appears in generated manifests
**Status:** ✅ PASS
- Injection logic: `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/commands/MetadataInjector.ts:68-89`
- Conditional injection only when fields exist

### AC-5: Optional metadata omitted when not configured
**Status:** ✅ PASS
- Empty check before injection: lines 77-88 use `if (templateMeta.field)` guards
- No empty strings injected

### AC-6: Existing metadata fields continue to work
**Status:** ✅ PASS
- `version`, `managedAt`, `resourceHash`, `stackId`, `resourceId` all preserved
- No breaking changes to existing fields

### AC-7: Documentation updates
**Status:** ⚠️ PARTIAL
- Spec documents exist in `.agent/issue-137/spec/`
- **Missing:** Updates to main README.md or user-facing docs
- **Missing:** Migration guide for users
- **Recommendation:** Create user documentation before merging

### AC-8: Tests verify metadata injection with/without optional fields
**Status:** ⚠️ PARTIAL

**Covered:**
- Unit tests for MetadataInjector: `/Users/thada/gits/thaitype/kubricate/packages/kubricate/src/commands/MetadataInjector.test.ts`
- Validation tests: 175 lines covering edge cases
- Integration tests for generate-metadata CLI: 209 lines

**Missing:**
- No tests verifying full stack template metadata in generated YAML
- No tests for config object form of `defineStackTemplate` with metadata
- No integration test showing metadata.author, metadata.homepage in final output

**Critical Gap:** Test coverage doesn't include end-to-end verification of stack template metadata appearing in Kubernetes manifests.

---

## 4. Code Changes Analysis

### Key Files Modified (40 files)

#### Core Package Changes
1. `/packages/core/src/defineStackTemplate.ts` (NEW, 186 lines)
   - Clean implementation of overloads
   - Proper coreVersion injection
   - Good JSDoc comments

2. `/packages/core/src/StackTemplateName.type.ts` (NEW, 122 lines)
   - Advanced TypeScript type validation
   - Comprehensive test cases in types
   - Minor issue: Error DX could be better

3. `/packages/core/src/metadata.gen.ts` (NEW, 11 lines)
   - Auto-generated file (version: 0.22.0)
   - Should be in .gitignore or regenerated in CI

#### Kubricate Package Changes
4. `/packages/kubricate/src/commands/MetadataInjector.ts` (160 lines)
   - Excellent backward compatibility handling
   - Conditional injection logic is clean
   - Proper separation of stackTemplateName vs stackName

5. `/packages/kubricate/src/commands/GenerateMetadataCommand.ts` (NEW, 117 lines)
   - Well-structured CLI command
   - Good error handling
   - File system abstraction for testability

6. `/packages/kubricate/src/commands/generate/Renderer.ts` (134 lines)
   - Template metadata passed correctly
   - Validation called before use (line 59)
   - Stack template retrieval from stack instance (line 53)

7. `/packages/kubricate/src/stack/Stack.ts` (modified)
   - Template reference stored in instance (line 30, 76)
   - `getTemplate()` method added (lines 42-45)
   - Clean implementation

#### Test Files
8. `/packages/kubricate/src/internal/validateStackTemplateName.test.ts` (NEW, 175 lines)
   - Excellent coverage of validation rules
   - Edge cases well tested
   - Error message validation included

9. `/tests/integration/generate-metadata.test.ts` (NEW, 209 lines)
   - Comprehensive CLI testing
   - Error cases covered
   - File system operations verified

---

## 5. Architecture Review

### Strengths

1. **Separation of Concerns** ✅
   - Types in @kubricate/core (stable)
   - Validation in kubricate (policy layer)
   - Clean dependency flow

2. **Type Safety** ✅
   - `StackTemplateMetadataInput` vs `StackTemplateMetadata` separation prevents user override
   - Overloads maintain backward compatibility without `any` types
   - Generic type parameters preserved

3. **Template Reference Storage** ✅
   - Stored as instance property `_template` in Stack class
   - Retrieved via `getTemplate()` method
   - No shared state or globals (verified in review-1.md)

4. **Metadata Injection Flow** ✅
   ```
   defineStackTemplate → StackTemplate (with metadata)
   → Stack.fromTemplate (stores template ref)
   → Renderer.injectMetadata (gets template, validates, passes to injector)
   → MetadataInjector.inject (conditionally injects fields)
   ```

5. **Dependency Injection** ✅
   - GenerateMetadataCommand accepts IFileSystem for testability
   - No runtime file access in core package
   - Version comes from generated constant, not runtime reads

### Concerns

1. **metadata.gen.ts in Source Control** ⚠️
   - `/packages/core/src/metadata.gen.ts` and `/packages/stacks/src/metadata.gen.ts` are checked in
   - Version will become stale if not regenerated before publish
   - **Recommendation:** Add prepublish script or CI check

2. **Missing User Documentation** ⚠️
   - Only internal spec docs exist
   - No user-facing migration guide
   - No examples in main README

3. **Test Coverage Gap** 🔴
   - No E2E test verifying template metadata in YAML output
   - Config object form of `defineStackTemplate` not tested
   - **Critical:** Should add integration test before merge

---

## 6. Test Coverage Assessment

### Coverage by Category

| Category | Status | Evidence |
|----------|--------|----------|
| Validation (unit) | ✅ Excellent | 175-line test file, all patterns covered |
| MetadataInjector (unit) | ✅ Good | Conditional injection tested |
| generate-metadata CLI (integration) | ✅ Excellent | 209-line test file, error cases included |
| defineStackTemplate overloads | ⚠️ Partial | Legacy form tested, config form NOT tested |
| Template metadata in YAML | 🔴 Missing | No E2E test for final output |
| Stack template name validation | ✅ Excellent | Edge cases, length limits, error messages |
| coreVersion injection | ⚠️ Indirect | Not explicitly tested, only via type tests |

### Critical Missing Test

**Scenario:** Generate Kubernetes manifest from stack template with full metadata and verify annotations

**Expected Test:**
```typescript
it('should inject stack template metadata into generated manifests', async () => {
  const template = defineStackTemplate({
    name: '@test/templates/my-app',
    metadata: {
      version: '2.0.0',
      author: 'Test Team',
      homepage: 'https://example.com',
      repository: 'https://github.com/test/repo',
    },
    build: (input) => ({ deployment: new Deployment({...}) }),
  });

  const stack = Stack.fromTemplate(template, {...});
  const yaml = generateManifest(stack);

  expect(yaml).toContain('kubricate.thaitype.dev/stack-template-name: "@test/templates/my-app"');
  expect(yaml).toContain('kubricate.thaitype.dev/stack-template-version: "2.0.0"');
  expect(yaml).toContain('kubricate.thaitype.dev/stack-template-author: "Test Team"');
  expect(yaml).toContain('kubricate.thaitype.dev/stack-template-core-version: "0.22.0"');
});
```

**Location:** Should be in `/tests/integration/` or snapshot tests

---

## 7. Security & Best Practices

### Security Considerations ✅

1. **Input Validation** ✅
   - Stack template names validated before use
   - Pattern matching prevents injection attacks
   - Length limits enforced (253 chars - Kubernetes annotation limit)

2. **No Secrets Exposure** ✅
   - Metadata is descriptive only (author, homepage, etc.)
   - No secret values in template metadata
   - Version info is safe to expose

3. **Injection Safety** ✅
   - Metadata injected into structured annotations
   - No string concatenation vulnerabilities
   - YAML rendering uses safe library (js-yaml)

### Best Practices

1. **Error Messages** ✅ Excellent
   - Validation errors are clear and actionable
   - Include examples and allowed patterns
   - Show actual vs. expected values

2. **Naming Conventions** ✅
   - Follows package.json conventions (familiar to developers)
   - Kebab-case enforcement for consistency
   - npm-style scoping (`@org/name`)

3. **Type Safety** ✅
   - No `any` types in public API
   - Generics preserve type information
   - Conditional types for pattern validation

4. **Backward Compatibility** ✅
   - Old annotation kept during transition
   - Deprecation notice added
   - Migration path documented in constants.ts

---

## 8. Performance Impact

**Assessment:** Minimal impact, no concerns

**Analysis:**
- Metadata injection happens during manifest generation (not hot path)
- Validation is regex-based (fast)
- No additional network calls or file I/O in hot paths
- `coreVersion` injected at definition time (zero runtime cost)

**Measurements:** N/A (not a performance-critical feature)

---

## 9. Breaking Changes & Migration

### Breaking Changes in v0.23: NONE ✅

All changes are additive:
- New annotations added alongside old
- New API form doesn't break existing usage
- Validation only runs on new naming patterns

### Planned Breaking Changes in v1.0

From `/packages/kubricate/src/commands/constants.ts:22-27`:
```typescript
/**
 * @deprecated use stackTemplateName instead
 *
 * Will be removed in v1.0 (kept for backward compatibility)
 */
stackName: FRAMEWORK_LABEL + '/stack-name',
```

### Migration Path

**Phase 1 (v0.23 - Current):**
- Both annotations present
- Users can adopt new API at their pace
- No warnings yet

**Phase 2 (v0.24-v0.30 - Recommended):**
- Add console warning when old API detected
- Update all examples to new API
- **Missing:** This is not yet implemented

**Phase 3 (v1.0):**
- Remove `stackName` annotation
- Remove deprecated constants
- **Blocker:** Requires user documentation first

---

## 10. Issues Found

### 🟥 Critical Issues (Must Fix)

**NONE** - No critical bugs found

### 🟧 Warnings (Should Fix)

**W1: Missing End-to-End Test for Template Metadata**
- **File:** Tests
- **Issue:** No integration test verifying template metadata appears in final YAML output
- **Impact:** Medium - Could miss regression in metadata injection flow
- **Fix:** Add integration test (see section 6 for example)
- **Status:** Should fix before merge

**W2: metadata.gen.ts Staleness Risk**
- **File:** `/packages/core/src/metadata.gen.ts`, `/packages/stacks/src/metadata.gen.ts`
- **Issue:** Generated files checked into source control, version hardcoded to "0.22.0"
- **Impact:** Low - Will cause version mismatch if not regenerated before publish
- **Fix:** Add `prepublishOnly` script or CI check:
  ```json
  "scripts": {
    "prepublishOnly": "kubricate generate-metadata"
  }
  ```
- **Status:** Should fix before v0.23 release

**W3: Missing User Documentation**
- **File:** README.md (not updated)
- **Issue:** Only internal spec docs exist, no user-facing guide
- **Impact:** Medium - Users won't know about new features
- **Fix:** Add section to README showing:
  - How to use config object form
  - How to add metadata to templates
  - Migration guide from old API
- **Status:** Should add before merge

### 🟩 Suggestions (Nice to Have)

**S1: Test Coverage for Config Object Form**
- **File:** `/packages/core/src/helper.test.ts`
- **Issue:** Only legacy two-argument form tested
- **Suggestion:** Add tests for:
  ```typescript
  it('should support config object with metadata', () => {
    const template = defineStackTemplate({
      name: 'test',
      metadata: { version: '1.0.0' },
      build: () => ({})
    });
    expect(template.metadata?.version).toBe('1.0.0');
    expect(template.metadata?.coreVersion).toBeDefined();
  });
  ```

**S2: Type Error DX Improvement**
- **File:** `/packages/core/src/StackTemplateName.type.ts:94-95`
- **Issue:** Error message is a string literal, but doesn't fail compilation gracefully
- **Suggestion:** Consider using conditional types that produce better IDE hints:
  ```typescript
  export type StackTemplateName<S extends string> =
    IsStackTemplateName<S> extends true
      ? S
      : { _error: InvalidTemplateNameError, _providedValue: S };
  ```

**S3: Snapshot Test Updates**
- **File:** `/tests/integration/__snapshots__/`
- **Observation:** Snapshots updated to include new annotations
- **Suggestion:** Add snapshot test specifically for metadata-rich template to document expected output

---

## 11. Recommendations

### Before Merge (Required)

1. **Add E2E Test** 🔴 HIGH PRIORITY
   - Create integration test verifying template metadata in YAML
   - Test both minimal (no metadata) and full (all fields) cases
   - Location: `/tests/integration/template-metadata.test.ts`

2. **Add User Documentation** 🟧 MEDIUM PRIORITY
   - Update README.md with new API examples
   - Create migration guide (old API → new API)
   - Document all metadata fields and their meaning

3. **Fix metadata.gen.ts Regeneration** 🟧 MEDIUM PRIORITY
   - Add prepublish script to regenerate metadata files
   - Or add CI check to ensure versions match package.json
   - Document generation process in CONTRIBUTING.md

### Before v0.23 Release (Recommended)

4. **Add Deprecation Warning** 🟩 LOW PRIORITY
   - Add console.warn() when old API patterns detected
   - Guide users to new API in warning message
   - Track deprecation usage in telemetry (if available)

5. **Enhance Test Coverage** 🟩 LOW PRIORITY
   - Add tests for config object form of defineStackTemplate
   - Add tests explicitly verifying coreVersion injection
   - Add snapshot tests for metadata-rich templates

### Future Enhancements (v0.24+)

6. **Improve Type Error DX**
   - Better compile-time errors for invalid template names
   - IDE hints showing allowed patterns
   - Consider template literal types for stricter validation

7. **CLI Enhancements**
   - Add `kubricate template validate <name>` command
   - Add `kubricate template metadata <template>` command to show metadata
   - Better help text and examples in CLI

---

## 12. Migration Impact Assessment

### Impact on Existing Users: LOW ✅

**Existing Code:**
```typescript
// OLD API (still works)
const template = defineStackTemplate('SimpleApp', (input) => {...});
const stack = Stack.fromTemplate(template, {...});
```

**Generated Manifests:**
```yaml
# Before (v0.22)
annotations:
  kubricate.thaitype.dev/stack-name: SimpleApp

# After (v0.23) - Both annotations present
annotations:
  kubricate.thaitype.dev/stack-name: SimpleApp  # deprecated
  kubricate.thaitype.dev/stack-template-name: SimpleApp
```

**Breaking Changes:** None
**Required Actions:** None (optional migration to new API)
**Risk Level:** Very Low

### Impact on New Users: POSITIVE ✅

New users get:
- Clearer API (config object vs. positional args)
- Rich metadata support (version, author, homepage, etc.)
- Better template discoverability
- package.json-like conventions (familiar)

---

## 13. Design Critique

### What Works Well ✅

1. **Descriptor Pattern**
   - Single config object is more extensible than multiple positional args
   - Easy to add new fields without breaking changes
   - Clear and self-documenting

2. **Separation of Input vs. Internal Metadata**
   - `StackTemplateMetadataInput` (user-facing) vs. `StackTemplateMetadata` (with coreVersion)
   - Prevents user override of system fields
   - Clean type safety

3. **package.json Inspiration**
   - Familiar field names (version, author, homepage, repository)
   - Reduces learning curve
   - Industry-standard conventions

4. **metadata.gen.ts Pattern**
   - Runtime-agnostic (works in any JS environment)
   - No file system access in core package
   - Single source of truth (package.json)

5. **Validation Location**
   - In kubricate package (not core)
   - Keeps core stable and minimal
   - Policy enforcement at right layer

### Minor Design Concerns ⚠️

1. **Template Name Patterns**
   - Three allowed forms add some complexity
   - Could confuse users without good docs
   - **Mitigation:** Validation errors are clear and helpful

2. **Backward Compatibility Cost**
   - Injecting both old and new annotations doubles annotation count
   - Will persist until v1.0
   - **Mitigation:** Acceptable transition cost, clearly documented

3. **metadata.gen.ts Regeneration**
   - Manual step (or script) required before publish
   - Could forget to regenerate
   - **Mitigation:** Add automation (prepublish script or CI)

---

## 14. Code Quality Metrics

### TypeScript Quality: Excellent ✅

- No `any` types in public APIs (only in internal helpers with eslint-disable)
- Proper generic type parameters
- Advanced type-level validation
- JSDoc comments on all public APIs

### Test Quality: Good 🟧

- Unit tests: Comprehensive
- Integration tests: Good for CLI, missing for E2E
- Edge cases: Well covered
- Error cases: Well covered
- Snapshot tests: Updated

### Code Organization: Excellent ✅

- Clear file structure
- Proper separation of concerns
- Consistent naming conventions
- Good use of TypeScript features

### Documentation: Partial ⚠️

- Internal specs: Excellent
- Code comments: Good
- User-facing docs: Missing
- Migration guide: Missing

---

## 15. Final Verdict

### Overall Score: 85/100

**Breakdown:**
- Requirements Coverage: 95/100 (FR-1 to FR-7 all met)
- Design Alignment: 95/100 (Excellent adherence to design-v2.md)
- Code Quality: 90/100 (Clean, well-structured, type-safe)
- Test Coverage: 70/100 (Good unit tests, missing E2E)
- Documentation: 60/100 (Missing user-facing docs)
- Security: 100/100 (No vulnerabilities)
- Performance: 100/100 (No impact)
- Migration: 95/100 (Excellent backward compatibility)

### Recommendation: REQUEST CHANGES (Minor)

**Merge Blockers:**
1. Add E2E test for template metadata in YAML output
2. Add user documentation (README update + examples)
3. Fix metadata.gen.ts regeneration (add prepublish script or CI check)

**Non-Blockers (can address post-merge):**
4. Add deprecation warnings
5. Enhance test coverage for config object form
6. Improve type error DX

### Timeline Recommendation

**If blockers addressed:** Approve and merge ✅
**Estimated time to fix:** 2-4 hours
**Risk after fixes:** Very Low

---

## 16. Detailed Fix Instructions

### Fix 1: Add E2E Test (Required)

**File:** `/tests/integration/template-metadata-e2e.test.ts` (NEW)

```typescript
import { describe, expect, it } from 'vitest';
import { defineStackTemplate, Stack } from '@kubricate/core';
import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Renderer } from '../../packages/kubricate/src/commands/generate/Renderer';

describe('template metadata E2E', () => {
  it('should inject full stack template metadata into YAML', () => {
    const template = defineStackTemplate({
      name: '@test/templates/web-app',
      metadata: {
        version: '2.1.0',
        author: 'Platform Team <platform@example.com>',
        description: 'Production web application stack',
        homepage: 'https://docs.example.com/web-app',
        repository: 'https://github.com/example/web-app-stack',
      },
      build: (input: { name: string }) => ({
        deployment: new Deployment({
          metadata: { name: input.name },
          spec: { replicas: 1, selector: { matchLabels: { app: input.name } } },
        }),
      }),
    });

    const stack = Stack.fromTemplate(template, { name: 'test-app' });
    const config = { stacks: { 'test-stack': stack } };
    const renderer = new Renderer(config, console);
    const results = renderer.renderStacks(config);

    expect(results[0].content).toContain('kubricate.thaitype.dev/stack-template-name: "@test/templates/web-app"');
    expect(results[0].content).toContain('kubricate.thaitype.dev/stack-template-version: "2.1.0"');
    expect(results[0].content).toContain('kubricate.thaitype.dev/stack-template-author: "Platform Team <platform@example.com>"');
    expect(results[0].content).toContain('kubricate.thaitype.dev/stack-template-description: "Production web application stack"');
    expect(results[0].content).toContain('kubricate.thaitype.dev/stack-template-homepage: "https://docs.example.com/web-app"');
    expect(results[0].content).toContain('kubricate.thaitype.dev/stack-template-repository: "https://github.com/example/web-app-stack"');
    expect(results[0].content).toContain('kubricate.thaitype.dev/stack-template-core-version:');
  });

  it('should generate minimal metadata when template has no metadata', () => {
    const template = defineStackTemplate('simple-stack', (input: { name: string }) => ({
      deployment: new Deployment({
        metadata: { name: input.name },
        spec: { replicas: 1, selector: { matchLabels: { app: input.name } } },
      }),
    }));

    const stack = Stack.fromTemplate(template, { name: 'test-app' });
    const config = { stacks: { 'test-stack': stack } };
    const renderer = new Renderer(config, console);
    const results = renderer.renderStacks(config);

    expect(results[0].content).toContain('kubricate.thaitype.dev/stack-template-name: "simple-stack"');
    expect(results[0].content).not.toContain('kubricate.thaitype.dev/stack-template-version:');
    expect(results[0].content).not.toContain('kubricate.thaitype.dev/stack-template-author:');
  });
});
```

### Fix 2: Add User Documentation (Required)

**File:** `/README.md` (UPDATE)

Add new section after "Stack Templates":

```markdown
## Stack Template Metadata

### Defining Rich Stack Templates

Stack templates can include metadata like version, author, and documentation links using the config object syntax:

```typescript
import { defineStackTemplate } from '@kubricate/core';
import { metadata } from './metadata.gen.js'; // Auto-generated from package.json

export const webAppTemplate = defineStackTemplate({
  name: '@myorg/templates/web-app',
  metadata: {
    version: metadata.version, // Sync with package.json
    author: 'Platform Team <platform@myorg.com>',
    description: 'Production-ready web application with monitoring and autoscaling',
    homepage: 'https://docs.myorg.com/templates/web-app',
    repository: 'https://github.com/myorg/templates',
  },
  build(input) {
    return {
      deployment: new Deployment({ /* ... */ }),
      service: new Service({ /* ... */ }),
    };
  },
});
```

### Stack Template Naming

Stack template names must follow one of these patterns:

- `<template-name>` - Simple name (e.g., `web-app`)
- `@<org>/<template-name>` - Organization-scoped (e.g., `@myorg/web-app`)
- `@<org>/<package>/<template-name>` - Namespaced (e.g., `@myorg/templates/web-app`)

**Rules:**
- Only lowercase letters, numbers, dots, underscores, and hyphens allowed
- Maximum 253 characters (Kubernetes annotation limit)
- No spaces or uppercase letters

### Generated Metadata

When you use stack templates with metadata, Kubricate injects these annotations into your Kubernetes resources:

```yaml
metadata:
  annotations:
    kubricate.thaitype.dev/stack-template-name: "@myorg/templates/web-app"
    kubricate.thaitype.dev/stack-template-version: "1.0.0"
    kubricate.thaitype.dev/stack-template-author: "Platform Team <platform@myorg.com>"
    kubricate.thaitype.dev/stack-template-description: "Production-ready web application..."
    kubricate.thaitype.dev/stack-template-homepage: "https://docs.myorg.com/templates/web-app"
    kubricate.thaitype.dev/stack-template-repository: "https://github.com/myorg/templates"
    kubricate.thaitype.dev/stack-template-core-version: "0.22.0"
```

### Generating metadata.gen.ts

To automatically sync your template version with your package.json:

```bash
kubricate generate-metadata
```

This creates or updates `src/metadata.gen.ts` with your package version. Add this to your build or prepublish script:

```json
{
  "scripts": {
    "prepublishOnly": "kubricate generate-metadata"
  }
}
```

### Migration from Old API

The legacy two-argument form still works:

```typescript
// Old API (still supported)
const template = defineStackTemplate('web-app', (input) => ({ /* ... */ }));

// New API (recommended)
const template = defineStackTemplate({
  name: 'web-app',
  metadata: { version: '1.0.0' },
  build(input) { /* ... */ }
});
```

Both produce the same result. The config object form is recommended for templates that need metadata or will grow over time.
```

### Fix 3: Add Prepublish Script (Required)

**File:** `/packages/core/package.json` (UPDATE)
**File:** `/packages/stacks/package.json` (UPDATE)

Add to scripts section:

```json
{
  "scripts": {
    "prepublishOnly": "kubricate generate-metadata --cwd $PWD --outfile src/metadata.gen.ts"
  }
}
```

**Alternative:** Add CI check in `.github/workflows/release.yml`:

```yaml
- name: Regenerate metadata files
  run: |
    pnpm --filter @kubricate/core exec kubricate generate-metadata
    pnpm --filter @kubricate/stacks exec kubricate generate-metadata
    git diff --exit-code || (echo "metadata.gen.ts files are out of sync. Run 'pnpm kubricate generate-metadata' in each package." && exit 1)
```

---

## 17. Related Files Reference

### Core Implementation
- `/packages/core/src/defineStackTemplate.ts` - Main API implementation
- `/packages/core/src/StackTemplateName.type.ts` - Type-level validation
- `/packages/core/src/metadata.gen.ts` - Auto-generated version constant
- `/packages/core/src/helper.test.ts` - Unit tests (needs enhancement)

### Kubricate Package
- `/packages/kubricate/src/commands/MetadataInjector.ts` - Metadata injection logic
- `/packages/kubricate/src/commands/constants.ts` - Label/annotation constants
- `/packages/kubricate/src/commands/GenerateMetadataCommand.ts` - CLI command for metadata.gen.ts
- `/packages/kubricate/src/commands/generate/Renderer.ts` - Orchestration and validation
- `/packages/kubricate/src/stack/Stack.ts` - Template reference storage
- `/packages/kubricate/src/internal/utils.ts` - Validation helpers

### Tests
- `/packages/kubricate/src/internal/validateStackTemplateName.test.ts` - Validation tests
- `/packages/kubricate/src/commands/MetadataInjector.test.ts` - Injector tests
- `/tests/integration/generate-metadata.test.ts` - CLI E2E tests
- `/tests/integration/__snapshots__/*.snap` - Snapshot tests (updated)

### Examples
- `/packages/stacks/src/simpleAppTemplate.ts` - Real-world usage example
- `/packages/stacks/src/namespaceTemplate.ts` - Minimal usage example
- `/examples/with-stack-template/*` - Example project

### Documentation
- `/.agent/issue-137/spec/requirement.md` - Original requirements
- `/.agent/issue-137/spec/design-v2.md` - Detailed design specification
- `/.agent/issue-137/spec/criticize-report-4.md` - coreVersion design refinement
- `/.agent/issue-137/review-result/review-1.md` - Previous review (metadata isolation)

---

## Appendix: Test Execution Results

**Status:** ✅ All existing tests pass

**Evidence:** Test run output shows:
- @kubricate/core: 5/5 tests passed
- @kubricate/template: 1/1 test passed
- No test failures reported
- Coverage enabled with istanbul

**Note:** While existing tests pass, the critical missing test is for E2E template metadata verification, which should be added per Fix #1.

---

**Reviewer Signature:** Claude Code (Senior PR Reviewer)
**Review Date:** 2025-11-19
**Review Version:** 2 (Comprehensive)
