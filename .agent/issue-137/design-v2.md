# High-Level Design v2: Stack Template Metadata Enhancement

> **Revision Notes:** This design incorporates feedback from critique reports focusing on:
> - Descriptor pattern with backward-compatible overloads
> - Split user-input metadata from internal metadata (coreVersion injection)
> - package.json-inspired field names (homepage, repository)
> - Stack template naming rules and validation
> - Clear separation: validation in `kubricate`, types in `@kubricate/core`

## Problem Statement

After PR #131 clarified the terminology distinction between "Stack Template" (blueprint) and "Stack" (instance), the current metadata injection system has the following gaps:

1. **Terminology Mismatch**: Uses `kubricate.thaitype.dev/stack-name` but should reflect "stack template" concept
2. **No Metadata API**: `StackTemplate` type has only `{ name, create }` - no way to define version, author, homepage, repository
3. **Missing Optional Fields**: No mechanism to inject template metadata beyond the name
4. **Ambiguous Naming**: "stack name" conflates template name (blueprint) and instance name (runtime)
5. **No Naming Standards**: Stack template names lack conventions or validation

## Current Implementation

**Key Files:**
- `packages/kubricate/src/commands/MetadataInjector.ts` - Injection logic
- `packages/kubricate/src/commands/constants.ts` - Label/annotation keys
- `packages/core/src/helper.ts` - StackTemplate type definition
- `packages/kubricate/src/stack/Stack.ts` - Stack implementation

**Current Metadata Flow:**
```
StackTemplate.name → Stack.getName() → MetadataInjector.options.stackName
→ metadata.annotations['kubricate.thaitype.dev/stack-name']
```

## Proposed Solution

### 1. Stack Template Naming Convention

**Single Field, Three Allowed Patterns:**

The `stack-template-name` must match exactly one of these patterns:

1. `<templateName>` - Simple name (e.g., `simple-app`)
2. `@<orgName>/<templateName>` - Scoped to organization (e.g., `@acme/simple-app`)
3. `@<orgName>/<packageName>/<templateName>` - Namespaced (e.g., `@acme/app-stacks/simple-app`)

**Character Set:**
- Allowed: `a-z`, `0-9`, `.`, `_`, `-`
- No spaces, uppercase, or special characters

**Examples:**
```typescript
// Valid names
"simple-app"
"web-server"
"@acme/simple-app"
"@acme/app-stacks/simple-app"
"@platform-team/k8s-templates/web-server-v2"

// Invalid names
"Simple App"              // has space
"SimpleApp"               // uppercase
"@acme/My Stack"          // space + uppercase
```

### 2. Enhance StackTemplate Type

**File:** `packages/core/src/helper.ts`

```typescript
// User-facing metadata (what users provide)
export interface StackTemplateMetadataInput {
  version: string;          // Required: Template version (e.g., "1.0.0")
  author?: string;          // Optional: "Platform Team" or "John Doe <john@acme.com>"
  description?: string;     // Optional: Human-readable description
  homepage?: string;        // Optional: Documentation URL (like package.json)
  repository?: string;      // Optional: Repository URL (like package.json)
}

// Internal metadata (Kubricate augments with coreVersion)
export interface StackTemplateMetadata extends StackTemplateMetadataInput {
  coreVersion: string;      // Injected from @kubricate/core, not user-settable
}

// Descriptor for rich template definition
export interface StackTemplateDescriptor {
  name: string;
  metadata?: StackTemplateMetadataInput;  // User-facing shape (no coreVersion)
}

// StackTemplate type (unchanged structure, but metadata is now StackTemplateMetadata)
export type StackTemplate<TInput, TResourceMap extends Record<string, unknown>> = {
  name: string;
  create: (input: TInput) => TResourceMap;
  metadata?: StackTemplateMetadata;  // CHANGED: Now includes coreVersion
};
```

**API Usage Examples:**

```typescript
// 1. Existing API (backward compatible)
const SimpleTemplate = defineStackTemplate('simple-app', (input) => ({
  deployment: new Deployment({ ... }),
  service: new Service({ ... }),
}));

// 2. Scoped name
const SimpleTemplate = defineStackTemplate('@acme/simple-app', (input) => ({
  deployment: new Deployment({ ... }),
  service: new Service({ ... }),
}));

// 3. New descriptor API with metadata
const SimpleTemplate = defineStackTemplate(
  {
    name: '@acme/app-stacks/simple-app',
    metadata: {
      version: '1.0.0',
      author: 'Platform Team',
      description: 'Production-ready web application stack',
      homepage: 'https://docs.acme.com/stacks/simple-app',
      repository: 'https://github.com/acme/app-stacks',
    },
  },
  (input) => ({
    deployment: new Deployment({ ... }),
    service: new Service({ ... }),
  })
);
```

### 3. Update defineStackTemplate with Overloads

**File:** `packages/core/src/helper.ts`

```typescript
// Overload 1: Existing API (string name)
export function defineStackTemplate<
  TInput,
  TResourceMap extends Record<string, unknown>
>(
  name: string,
  create: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap>;

// Overload 2: New descriptor API
export function defineStackTemplate<
  TInput,
  TResourceMap extends Record<string, unknown>
>(
  descriptor: StackTemplateDescriptor,
  create: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap>;

// Implementation
export function defineStackTemplate<
  TInput,
  TResourceMap extends Record<string, unknown>
>(
  nameOrDescriptor: string | StackTemplateDescriptor,
  create: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap> {
  const descriptor: StackTemplateDescriptor =
    typeof nameOrDescriptor === 'string'
      ? { name: nameOrDescriptor }
      : nameOrDescriptor;

  // Inject coreVersion from @kubricate/core package version
  // This ensures users cannot override it
  const coreVersion = getCoreVersion(); // Import from version constant

  const metadata: StackTemplateMetadata | undefined = descriptor.metadata
    ? { ...descriptor.metadata, coreVersion }
    : undefined;

  return {
    name: descriptor.name,
    create,
    metadata,
  };
}
```

**Note:** `getCoreVersion()` should be imported from a version constant file in `@kubricate/core` that's generated at build time (similar to how `kubricate` package does it).

### 4. Add Validation in kubricate Package

**File:** `packages/kubricate/src/internal/utils.ts`

```typescript
/**
 * Validates stack template name format.
 *
 * Allowed patterns:
 * 1. <templateName>
 * 2. @<orgName>/<templateName>
 * 3. @<orgName>/<packageName>/<templateName>
 *
 * Character set: a-z, 0-9, ., _, -
 */
export function validateStackTemplateName(name: string): void {
  const pattern = /^(?:@[a-z0-9._-]+\/)?(?:[a-z0-9._-]+\/)?[a-z0-9._-]+$/;

  if (!pattern.test(name)) {
    throw new Error(
      `Invalid stack template name: "${name}"\n\n` +
      `Stack template names must match one of these patterns:\n` +
      `  1. <templateName>\n` +
      `  2. @<orgName>/<templateName>\n` +
      `  3. @<orgName>/<packageName>/<templateName>\n\n` +
      `Allowed characters: a-z, 0-9, . _ -\n` +
      `No spaces or uppercase letters allowed.\n\n` +
      `Examples:\n` +
      `  - simple-app\n` +
      `  - @acme/simple-app\n` +
      `  - @acme/app-stacks/simple-app`
    );
  }

  // Additional validation: maximum length (Kubernetes annotation limit)
  if (name.length > 253) {
    throw new Error(
      `Stack template name too long: "${name}"\n` +
      `Maximum length is 253 characters (got ${name.length})`
    );
  }
}
```

**Validation Location:**
- Called in `Renderer.renderStacks()` before metadata injection
- Called in `ConfigLoader` when loading stack configurations
- **Not** enforced in `@kubricate/core` to keep core stable and minimal

### 5. Update Label Constants

**File:** `packages/kubricate/src/commands/constants.ts`

```typescript
export const FRAMEWORK_LABEL = 'kubricate.thaitype.dev';

export const LABELS = {
  kubricate: FRAMEWORK_LABEL,
  version: FRAMEWORK_LABEL + '/version',
  managedAt: FRAMEWORK_LABEL + '/managed-at',
  stackId: FRAMEWORK_LABEL + '/stack-id',

  // NEW: Stack template metadata
  stackTemplateName: FRAMEWORK_LABEL + '/stack-template-name',
  stackTemplateVersion: FRAMEWORK_LABEL + '/stack-template-version',
  stackTemplateAuthor: FRAMEWORK_LABEL + '/stack-template-author',
  stackTemplateDescription: FRAMEWORK_LABEL + '/stack-template-description',
  stackTemplateHomepage: FRAMEWORK_LABEL + '/stack-template-homepage',
  stackTemplateRepository: FRAMEWORK_LABEL + '/stack-template-repository',
  stackTemplateCoreVersion: FRAMEWORK_LABEL + '/stack-template-core-version',

  resourceId: FRAMEWORK_LABEL + '/resource-id',
  secretManagerId: FRAMEWORK_LABEL + '/secret-manager-id',
  secretManagerName: FRAMEWORK_LABEL + '/secret-manager-name',
  resourceHash: FRAMEWORK_LABEL + '/resource-hash',

  // DEPRECATED: Will be removed in v1.0
  stackName: FRAMEWORK_LABEL + '/stack-name',
};
```

### 6. Extend MetadataInjector

**File:** `packages/kubricate/src/commands/MetadataInjector.ts`

```typescript
export interface MetadataInjectorOptions {
  type: 'stack' | 'secret';
  kubricateVersion: string;
  managedAt?: string;

  // Stack fields
  stackId?: string;
  stackTemplateName?: string;  // NEW (renamed from stackName)
  resourceId?: string;

  // Stack template metadata (NEW)
  // Note: This is the full StackTemplateMetadata (includes coreVersion)
  stackTemplateMetadata?: {
    version: string;           // Template version (required if metadata exists)
    author?: string;
    description?: string;
    homepage?: string;
    repository?: string;
    coreVersion: string;       // Always present when metadata exists
  };

  // Secret fields
  secretManagerId?: string;
  secretManagerName?: string;

  inject?: {
    managedAt?: boolean;
    resourceHash?: boolean;
    version?: boolean;
  };
}
```

**Updated Injection Logic:**

```typescript
inject(resource: Record<string, unknown>): Record<string, unknown> {
  if (typeof resource !== 'object' || resource == null) {
    return resource;
  }

  const metadata = this.ensureMetadata(resource);

  metadata.labels ??= {};
  metadata.annotations ??= {};

  metadata.labels[LABELS.kubricate] = 'true';

  if (this.options.type === 'stack') {
    metadata.labels[LABELS.stackId] = this.options.stackId!;
    metadata.labels[LABELS.resourceId] = this.options.resourceId!;

    // NEW: Use stack-template-name instead of stack-name
    metadata.annotations[LABELS.stackTemplateName] = this.options.stackTemplateName!;

    // Inject stack template metadata if available
    const templateMeta = this.options.stackTemplateMetadata;
    if (templateMeta) {
      // coreVersion is always injected when metadata exists
      metadata.annotations[LABELS.stackTemplateCoreVersion] = templateMeta.coreVersion;

      // version is required when metadata exists
      metadata.annotations[LABELS.stackTemplateVersion] = templateMeta.version;

      // Optional fields (only inject if present)
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
  } else if (this.options.type === 'secret') {
    metadata.labels[LABELS.secretManagerId] = this.options.secretManagerId!;
    metadata.annotations[LABELS.secretManagerName] = this.options.secretManagerName!;
  }

  if (this.options.inject?.version) {
    metadata.annotations[LABELS.version] = this.options.kubricateVersion;
  }

  if (this.options.inject?.resourceHash) {
    metadata.annotations[LABELS.resourceHash] = this.calculateHash(resource);
  }

  if (this.options.inject?.managedAt) {
    metadata.annotations[LABELS.managedAt] = this.options.managedAt ?? new Date().toISOString();
  }

  return resource;
}
```

### 7. Update Renderer to Pass Template Metadata

**File:** `packages/kubricate/src/commands/generate/Renderer.ts`

```typescript
private injectMetadata(
  stackId: string,
  stack: Stack<unknown, Record<string, unknown>>,
  resourceId: string,
  resource: Record<string, unknown>
): Record<string, unknown> {
  // Validate stack template name
  const template = stack.getTemplate();
  if (template) {
    validateStackTemplateName(template.name);
  }

  const stackTemplateName = template?.name ?? getStackName(stack);

  const injector = new MetadataInjector({
    type: 'stack',
    kubricateVersion: version,
    stackId,
    stackTemplateName,  // NEW: Use validated template name
    resourceId,
    stackTemplateMetadata: template?.metadata,  // NEW: Pass template metadata
    inject: {
      managedAt: this.config.metadata?.injectManagedAt ?? true,
      resourceHash: this.config.metadata?.injectResourceHash ?? true,
      version: this.config.metadata?.injectVersion ?? true,
    },
  });

  return injector.inject(resource);
}
```

### 8. Store Template Reference in Stack

**File:** `packages/kubricate/src/stack/Stack.ts`

```typescript
export class Stack<Data, Entries extends Record<string, unknown>> extends BaseStack {
  private _template?: StackTemplate<Data, Entries>;  // NEW

  constructor(public builder: ConfigureComposerFunction<Data, Entries>) {
    super();
  }

  static fromTemplate<TInput, TResourceMap extends Record<string, unknown>>(
    factory: StackTemplate<TInput, TResourceMap>,
    input: TInput
  ): Stack<TInput, TResourceMap> {
    const stack = new Stack<TInput, TResourceMap>(() => factory.create(input));
    stack._template = factory;  // Store template reference
    return stack;
  }

  static fromStatic<TResources extends Record<string, unknown>>(
    name: string,
    resources: TResources
  ): Stack<undefined, TResources> {
    return new Stack(() => resources);
  }

  // NEW: Get template reference
  getTemplate(): StackTemplate<Data, Entries> | undefined {
    return this._template;
  }
}
```

## Package.json Inspiration

The metadata fields follow `package.json` conventions for familiarity:

| Field | package.json | Kubricate StackTemplate |
|-------|-------------|------------------------|
| Name | `name` | `name` |
| Version | `version` | `metadata.version` |
| Author | `author` | `metadata.author` |
| Description | `description` | `metadata.description` |
| Homepage | `homepage` | `metadata.homepage` |
| Repository | `repository` | `metadata.repository` |

**Why not `org` field?**
- Organization is encoded in the name using npm-style scoping: `@orgName/templateName`
- Avoids duplication and confusion
- Follows established npm conventions

**Why `homepage` instead of `docsUrl`?**
- Consistent with `package.json`
- Developers already familiar with this field
- More flexible (can point to docs, marketing page, or wiki)

## Migration Strategy

### Phase 1: Additive Changes (Non-Breaking) - v0.23

1. Add `StackTemplateMetadataInput`, `StackTemplateMetadata`, `StackTemplateDescriptor` types
2. Add descriptor overload to `defineStackTemplate()`
3. Add `validateStackTemplateName()` helper
4. Add new label constants (keep old `stackName` for compatibility)
5. Update `MetadataInjector` to inject new fields when available
6. **Inject both** `stack-name` and `stack-template-name` annotations
7. Update documentation with examples and migration guide

**Backward Compatibility:**
```yaml
# Old and new annotations both present during transition
metadata:
  annotations:
    kubricate.thaitype.dev/stack-name: SimpleApp  # DEPRECATED
    kubricate.thaitype.dev/stack-template-name: simple-app  # NEW
```

### Phase 2: Deprecation Warning - v0.24-v0.30

1. Add console warning when using old `stack-name` annotation
2. Update all examples and docs to use new API
3. Release comprehensive migration guide
4. Community feedback period

### Phase 3: Breaking Change - v1.0

1. Remove deprecated `LABELS.stackName`
2. Remove old `stack-name` annotation from output
3. Remove backward compatibility code
4. Update all tests and snapshots

## Example Output

### Minimal Example (No Metadata)

```typescript
const MinimalTemplate = defineStackTemplate('simple-app', (input) => ({
  deployment: new Deployment({ ... }),
}));
```

```yaml
metadata:
  labels:
    kubricate.thaitype.dev: "true"
    kubricate.thaitype.dev/stack-id: frontend
    kubricate.thaitype.dev/resource-id: deployment
  annotations:
    kubricate.thaitype.dev/stack-template-name: simple-app
    kubricate.thaitype.dev/version: 0.23.0
    kubricate.thaitype.dev/resource-hash: e0e99dc895c6a6cd20e9facbb6974b2ebfdcc78b6ec65f34125e9477367a41ee
    kubricate.thaitype.dev/managed-at: "2024-01-15T10:30:00.000Z"
```

### Full Example (With Metadata)

```typescript
const FullTemplate = defineStackTemplate(
  {
    name: '@acme/app-stacks/simple-app',
    metadata: {
      version: '1.0.0',
      author: 'Platform Team <platform@acme.com>',
      description: 'Production-ready web application with monitoring and autoscaling',
      homepage: 'https://docs.acme.com/stacks/simple-app',
      repository: 'https://github.com/acme/app-stacks',
    },
  },
  (input) => ({
    deployment: new Deployment({ ... }),
    service: new Service({ ... }),
  })
);
```

```yaml
metadata:
  labels:
    kubricate.thaitype.dev: "true"
    kubricate.thaitype.dev/stack-id: frontend
    kubricate.thaitype.dev/resource-id: deployment
  annotations:
    # Stack template metadata (NEW)
    kubricate.thaitype.dev/stack-template-name: "@acme/app-stacks/simple-app"
    kubricate.thaitype.dev/stack-template-version: "1.0.0"
    kubricate.thaitype.dev/stack-template-author: "Platform Team <platform@acme.com>"
    kubricate.thaitype.dev/stack-template-description: "Production-ready web application with monitoring and autoscaling"
    kubricate.thaitype.dev/stack-template-homepage: "https://docs.acme.com/stacks/simple-app"
    kubricate.thaitype.dev/stack-template-repository: "https://github.com/acme/app-stacks"
    kubricate.thaitype.dev/stack-template-core-version: "0.22.1"

    # Framework metadata (existing)
    kubricate.thaitype.dev/version: "0.23.0"
    kubricate.thaitype.dev/resource-hash: "e0e99dc895c6a6cd20e9facbb6974b2ebfdcc78b6ec65f34125e9477367a41ee"
    kubricate.thaitype.dev/managed-at: "2024-01-15T10:30:00.000Z"
```

## Testing Strategy

### 1. Unit Tests

**File:** `packages/core/src/helper.test.ts`
- `defineStackTemplate()` with string name (existing behavior)
- `defineStackTemplate()` with descriptor (new behavior)
- Verify `coreVersion` is injected automatically
- Verify user cannot override `coreVersion`

**File:** `packages/kubricate/src/internal/utils.test.ts`
- `validateStackTemplateName()` with valid patterns
- `validateStackTemplateName()` with invalid patterns (should throw)
- Edge cases: max length, special characters, empty strings

**File:** `packages/kubricate/src/commands/MetadataInjector.test.ts`
- Inject minimal metadata (no template metadata)
- Inject full metadata (all fields present)
- Inject partial metadata (some optional fields missing)
- Verify optional fields are omitted when not provided

### 2. Integration Tests

**File:** `tests/integration/generate-with-template-metadata.test.ts`
- Generate manifests with full template metadata
- Generate manifests with minimal template metadata
- Generate manifests with scoped names (`@org/name`)
- Generate manifests with namespaced names (`@org/pkg/name`)
- Verify YAML output matches expected structure

### 3. Snapshot Tests

- Update existing snapshots to expect `stack-template-name` instead of `stack-name`
- Add snapshots for stacks with various metadata configurations
- Add snapshots for different naming patterns

### 4. Validation Tests

**File:** `tests/integration/validation.test.ts`
- Valid names pass validation
- Invalid names throw with helpful error messages
- Names exceeding length limit throw with helpful error messages

## Breaking Changes Summary

| Change | Impact | Migration |
|--------|--------|-----------|
| `stack-name` → `stack-template-name` | Annotation key renamed | Both injected in v0.23, old removed in v1.0 |
| Template name validation | Invalid names will throw | Update names to match allowed patterns |
| `coreVersion` always injected | New annotation when metadata exists | None (additive) |
| `StackTemplate.metadata` type changed | Internal only | None (transparent to users) |

## Open Questions & Decisions

### 1. Field Naming: `homepage` vs `docsUrl`

**Decision:** Use `homepage` (following package.json)
- Rationale: Familiar to developers, flexible usage, established convention
- `docsUrl` is more specific but less standard

### 2. Should we support both fields?

**Decision:** No, stick with `homepage` only
- Rationale: Reduces confusion, keeps API surface minimal
- Document that `homepage` should point to docs/reference material

### 3. Validation strictness

**Decision:** Strict validation with clear error messages
- Rationale: Prevents issues early, ensures consistent naming across ecosystem
- Error messages guide users to correct format

### 4. coreVersion injection location

**Decision:** Inject in `defineStackTemplate()` helper
- Rationale: Users cannot override, deterministic, single source of truth
- Alternative (rejected): Inject in MetadataInjector - would require passing core version around

### 5. Should `version` be required when metadata exists?

**Decision:** Yes, `version` is required if `metadata` is provided
- Rationale: Template versioning is core value proposition of metadata feature
- Makes snapshots and change tracking meaningful

## Architecture Principles

### 1. Separation of Concerns
- **@kubricate/core**: Types, contracts, minimal runtime behavior
- **kubricate**: Validation, policy enforcement, CLI logic

### 2. Backward Compatibility
- Use phased rollout with deprecation warnings
- Keep old fields until v1.0
- Provide clear migration path

### 3. Developer Experience
- Follow familiar conventions (npm/package.json)
- Clear, actionable error messages
- Minimal breaking changes

### 4. Type Safety
- Split user-input and internal metadata types
- Prevent users from overriding system fields (coreVersion)
- Use TypeScript overloads for backward compatibility

## Implementation Checklist

- [ ] **@kubricate/core changes**
  - [ ] Add `StackTemplateMetadataInput` interface
  - [ ] Add `StackTemplateMetadata` interface
  - [ ] Add `StackTemplateDescriptor` interface
  - [ ] Add version constant export (for coreVersion)
  - [ ] Update `StackTemplate` type to include `metadata?: StackTemplateMetadata`
  - [ ] Add overloads to `defineStackTemplate()`
  - [ ] Implement coreVersion injection in `defineStackTemplate()`
  - [ ] Write unit tests

- [ ] **kubricate package changes**
  - [ ] Add `validateStackTemplateName()` helper
  - [ ] Add validation tests
  - [ ] Update `constants.ts` with new label keys
  - [ ] Update `MetadataInjectorOptions` interface
  - [ ] Update `MetadataInjector.inject()` logic
  - [ ] Add `getTemplate()` method to Stack class
  - [ ] Store template reference in `Stack.fromTemplate()`
  - [ ] Update `Renderer.injectMetadata()` to validate and pass template metadata
  - [ ] Write unit tests
  - [ ] Write integration tests

- [ ] **Documentation & Examples**
  - [ ] Update README with new metadata examples
  - [ ] Create migration guide
  - [ ] Update API documentation
  - [ ] Update all example projects
  - [ ] Update built-in stack templates with metadata
  - [ ] Add JSDoc comments to new interfaces

- [ ] **Testing**
  - [ ] Unit tests for validation
  - [ ] Unit tests for metadata injection
  - [ ] Integration tests for manifest generation
  - [ ] Snapshot tests with new metadata structure
  - [ ] Edge case testing (max lengths, special chars, etc.)

- [ ] **Deprecation (for v1.0)**
  - [ ] Add deprecation warnings for old `stack-name` annotation
  - [ ] Create GitHub issue to track removal in v1.0
  - [ ] Update CHANGELOG with deprecation notice
