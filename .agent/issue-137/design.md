# High-Level Design: Stack Template Metadata Enhancement

## Problem Statement

After PR #131 clarified the terminology distinction between "Stack Template" (blueprint) and "Stack" (instance), the current metadata injection system has the following gaps:

1. **Terminology Mismatch**: Uses `kubricate.thaitype.dev/stack-name` but should reflect "stack template" concept
2. **No Metadata API**: `StackTemplate` type has only `{ name, create }` - no way to define version, author, org, docs
3. **Missing Optional Fields**: No mechanism to inject org, author, docsUrl, or template version
4. **Ambiguous Naming**: "stack name" conflates template name (blueprint) and instance name (runtime)

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

### 1. Enhance StackTemplate Type

**File:** `packages/core/src/helper.ts`

```typescript
export interface StackTemplateMetadata {
  version?: string;      // e.g., "1.0.0"
  author?: string;       // e.g., "John Doe <john@example.com>"
  org?: string;          // e.g., "my-organization"
  docsUrl?: string;      // e.g., "https://docs.example.com/stacks/simple-app"
  description?: string;  // Optional human-readable description
}

export type StackTemplate<TInput, TResourceMap extends Record<string, unknown>> = {
  name: string;
  create: (input: TInput) => TResourceMap;
  metadata?: StackTemplateMetadata;  // NEW
};
```

**API Usage:**
```typescript
const SimpleAppTemplate = defineStackTemplate('SimpleAppStack', (input) => ({
  deployment: new Deployment({ ... }),
  service: new Service({ ... }),
}), {
  version: '1.0.0',
  author: 'Platform Team',
  org: 'acme-corp',
  docsUrl: 'https://docs.acme.com/stacks/simple-app',
});
```

Update `defineStackTemplate()` signature to accept optional third parameter.

### 2. Update Label Constants

**File:** `packages/kubricate/src/commands/constants.ts`

```typescript
export const LABELS = {
  kubricate: FRAMEWORK_LABEL,
  version: FRAMEWORK_LABEL + '/version',
  managedAt: FRAMEWORK_LABEL + '/managed-at',
  stackId: FRAMEWORK_LABEL + '/stack-id',

  // CHANGED: Rename to clarify template vs instance
  stackTemplateName: FRAMEWORK_LABEL + '/stack-template-name',  // NEW
  stackTemplateVersion: FRAMEWORK_LABEL + '/stack-template-version',  // NEW

  // Optional metadata
  stackTemplateAuthor: FRAMEWORK_LABEL + '/stack-template-author',  // NEW
  stackTemplateOrg: FRAMEWORK_LABEL + '/stack-template-org',  // NEW
  stackTemplateDocsUrl: FRAMEWORK_LABEL + '/stack-template-docs-url',  // NEW

  resourceId: FRAMEWORK_LABEL + '/resource-id',
  secretManagerId: FRAMEWORK_LABEL + '/secret-manager-id',
  secretManagerName: FRAMEWORK_LABEL + '/secret-manager-name',
  resourceHash: FRAMEWORK_LABEL + '/resource-hash',

  // DEPRECATED (keep for backward compatibility, remove in v1.0)
  stackName: FRAMEWORK_LABEL + '/stack-name',
};
```

### 3. Extend MetadataInjector

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
  stackTemplateMetadata?: {
    version?: string;
    author?: string;
    org?: string;
    docsUrl?: string;
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

**Injection Logic Update** (in `inject()` method):
```typescript
if (this.options.type === 'stack') {
  metadata.labels[LABELS.stackId] = this.options.stackId!;
  metadata.annotations[LABELS.stackTemplateName] = this.options.stackTemplateName!;
  metadata.labels[LABELS.resourceId] = this.options.resourceId!;

  // Inject optional template metadata
  const templateMeta = this.options.stackTemplateMetadata;
  if (templateMeta?.version) {
    metadata.annotations[LABELS.stackTemplateVersion] = templateMeta.version;
  }
  if (templateMeta?.author) {
    metadata.annotations[LABELS.stackTemplateAuthor] = templateMeta.author;
  }
  if (templateMeta?.org) {
    metadata.annotations[LABELS.stackTemplateOrg] = templateMeta.org;
  }
  if (templateMeta?.docsUrl) {
    metadata.annotations[LABELS.stackTemplateDocsUrl] = templateMeta.docsUrl;
  }
}
```

### 4. Update Renderer to Pass Template Metadata

**File:** `packages/kubricate/src/commands/generate/Renderer.ts`

When calling `new MetadataInjector()`, extract template metadata from stack:
- Access `Stack._template?.metadata` (need to store template reference in Stack)
- Pass as `stackTemplateMetadata` option

### 5. Store Template Reference in Stack

**File:** `packages/kubricate/src/stack/Stack.ts`

```typescript
export class Stack<Data, Entries extends Record<string, unknown>> extends BaseStack {
  private _template?: StackTemplate<Data, Entries>;  // NEW

  static fromTemplate<TInput, TResourceMap>(
    factory: StackTemplate<TInput, TResourceMap>,
    input: TInput
  ): Stack<TInput, TResourceMap> {
    const stack = new Stack<TInput, TResourceMap>(() => factory.create(input));
    stack._template = factory;  // Store reference
    return stack;
  }

  getTemplate() {
    return this._template;
  }
}
```

## Migration Strategy

### Phase 1: Additive Changes (Non-Breaking)
1. Add `metadata` field to `StackTemplate` type (optional)
2. Add new label constants (`stackTemplateName`, `stackTemplateVersion`, etc.)
3. Update `MetadataInjector` to inject new fields when available
4. **Keep old `stackName` annotation** for backward compatibility
5. Update documentation with deprecation notice

### Phase 2: Deprecation Warning (Minor Version)
1. Add console warning when reading old configs
2. Update all examples to use new API
3. Release migration guide

### Phase 3: Breaking Change (v1.0)
1. Remove deprecated `LABELS.stackName`
2. Remove backward compatibility code

## Testing Strategy

1. **Unit Tests:**
   - `MetadataInjector.test.ts`: Verify new annotations are injected correctly
   - `Stack.test.ts`: Verify template metadata is stored and accessible

2. **Integration Tests:**
   - Generate manifests with template metadata and verify YAML output
   - Generate manifests without template metadata (should omit optional fields)
   - Test backward compatibility with stacks using old API

3. **Snapshot Tests:**
   - Update existing snapshots to expect new `stack-template-name` annotation
   - Add snapshots for stacks with full template metadata

## Example Output

**Before:**
```yaml
metadata:
  annotations:
    kubricate.thaitype.dev/stack-name: SimpleApp
```

**After (with metadata):**
```yaml
metadata:
  annotations:
    kubricate.thaitype.dev/stack-template-name: SimpleAppStack
    kubricate.thaitype.dev/stack-template-version: 1.0.0
    kubricate.thaitype.dev/stack-template-author: Platform Team
    kubricate.thaitype.dev/stack-template-org: acme-corp
    kubricate.thaitype.dev/stack-template-docs-url: https://docs.acme.com/stacks/simple-app
```

**After (without metadata):**
```yaml
metadata:
  annotations:
    kubricate.thaitype.dev/stack-template-name: SimpleAppStack
```

## Breaking Changes

- **Label Key Rename**: `stack-name` → `stack-template-name`
  - Mitigation: Keep both during transition period
- **StackTemplate Type Expansion**: Adding optional `metadata` field
  - Mitigation: Field is optional, no breaking change to existing code

## Open Questions

1. **Should we keep both `stack-name` and `stack-template-name` indefinitely?**
   - Recommendation: No, deprecate in next minor, remove in v1.0

2. **Should stack instances have separate metadata from templates?**
   - Current: Only template metadata
   - Future: Could add instance-level metadata like `stack-instance-id`, `environment`

3. **Should metadata be validated?**
   - e.g., `version` must be semver, `docsUrl` must be valid URL
   - Recommendation: Add basic validation with helpful error messages

4. **Should all template metadata be annotations (not labels)?**
   - Recommendation: Yes, labels are for selectors. These are descriptive metadata.

## Implementation Checklist

- [ ] Update `StackTemplate` type in `@kubricate/core`
- [ ] Update `defineStackTemplate()` helper to accept metadata
- [ ] Add new label constants
- [ ] Update `MetadataInjectorOptions` interface
- [ ] Update `MetadataInjector.inject()` logic
- [ ] Store template reference in `Stack` class
- [ ] Update `Renderer` to pass template metadata
- [ ] Update all built-in stack templates with metadata
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Update examples
- [ ] Create migration guide
