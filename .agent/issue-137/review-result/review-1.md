# Code Review: Template Metadata Isolation

**Date:** 2025-11-19
**Reviewer:** Claude Code
**Objective:** Verify that each rendered file has its own template metadata when generating multiple stacks from different templates

## Executive Summary

✅ **No Issues Found** - Template metadata is correctly isolated between stacks. Each rendered file receives its own template metadata without cross-contamination.

## Architecture Analysis

### 1. Stack Template Reference Storage

**Location:** `packages/kubricate/src/stack/Stack.ts:76-80`

Each `Stack` instance stores its own **independent** template reference as an instance property:

```typescript
static fromTemplate<TInput, TResourceMap>(
  template: StackTemplate<TInput, TResourceMap>,
  input: TInput
): Stack<TInput, TResourceMap> {
  const stack = new Stack(builder);
  stack._template = template;  // ✅ Instance property, not static/shared
  return stack;
}
```

**Finding:** No shared state. Each stack maintains its own template reference.

### 2. Metadata Injection Flow

**Location:** `packages/kubricate/src/commands/generate/Renderer.ts:91-110`

The renderer processes each stack independently in a loop:

```typescript
renderStacks(config: KubricateConfig): RenderedResource[] {
  for (const [stackId, stack] of Object.entries(config.stacks)) {
    if (this.metadata.inject === true) {
      // ✅ Each iteration gets its own stack instance
      builtResources = this.injectMetadata(stack.build(), {
        stackId,
        stack,  // Current iteration's stack
      });
    }
  }
}
```

**Finding:** Metadata injection is scoped per-stack. No global state carries over between iterations.

### 3. Template Retrieval

**Location:** `packages/kubricate/src/commands/generate/Renderer.ts:53-59`

Template metadata is retrieved from the **current stack's template**:

```typescript
injectMetadata(resources, options: { stack: BaseStack }) {
  // ✅ Gets template from the specific stack instance
  const template = options.stack.getTemplate?.();
  const stackTemplateName = template?.name ?? 'unknown';

  // Uses THIS stack's template metadata
  stackTemplateMetadata: template?.metadata,
}
```

**Finding:** No template caching or shared references. Each stack provides its own template.

### 4. MetadataInjector Instantiation

**Location:** `packages/kubricate/src/commands/generate/Renderer.ts:61-84`

A **new MetadataInjector instance** is created for each resource:

```typescript
const createInjector = (resourceId: string) =>
  new MetadataInjector({
    stackTemplateName,              // ✅ From current stack's template
    stackTemplateMetadata: template?.metadata,  // ✅ From current stack's template
    resourceId,
    // ...
  });

for (const [resourceId, resource] of Object.entries(resources)) {
  const injector = createInjector(resourceId);  // ✅ New instance each time
  injector.inject(clone);
}
```

**Finding:** Each resource gets a fresh injector with the correct template metadata. No state sharing.

### 5. MetadataInjector Implementation

**Location:** `packages/kubricate/src/commands/MetadataInjector.ts:45-108`

The injector receives template metadata as an **immutable constructor parameter**:

```typescript
export class MetadataInjector {
  constructor(private readonly options: MetadataInjectorOptions) {}

  inject(resource: Record<string, unknown>) {
    const templateMeta = this.options.stackTemplateMetadata;  // ✅ Instance-scoped
    if (templateMeta) {
      metadata.annotations[LABELS.stackTemplateCoreVersion] = templateMeta.coreVersion;
      metadata.annotations[LABELS.stackTemplateVersion] = templateMeta.version;
      // ...
    }
  }
}
```

**Finding:** Metadata is stored per-instance in the constructor options. No mutation of shared objects.

## Multi-Stack Test Scenario

**Configuration:**
```typescript
export default defineConfig({
  stacks: {
    frontend: Stack.fromTemplate(namespaceTemplate, { name: 'frontend' }),
    backend: Stack.fromTemplate(simpleAppTemplate, { name: 'backend' }),
  },
});
```

**Expected Behavior:**
- Frontend resources: `kubricate.thaitype.dev/stack-template-name: namespace-template`
- Backend resources: `kubricate.thaitype.dev/stack-template-name: simple-app-template`

**Actual Behavior:** ✅ Correct isolation - each stack's resources receive their own template metadata

**Execution Flow:**
1. Renderer iterates over `{ frontend, backend }`
2. **Iteration 1 (frontend):**
   - Calls `injectMetadata(frontend.build(), { stack: frontend_instance })`
   - Gets `template = frontend_instance.getTemplate()` → `namespaceTemplate`
   - Creates MetadataInjector with `namespaceTemplate.metadata`
   - Injects into frontend resources
3. **Iteration 2 (backend):**
   - Calls `injectMetadata(backend.build(), { stack: backend_instance })`
   - Gets `template = backend_instance.getTemplate()` → `simpleAppTemplate`
   - Creates MetadataInjector with `simpleAppTemplate.metadata`
   - Injects into backend resources

**Result:** No cross-contamination. Each stack maintains independent metadata.

## Verification Checklist

| Risk Factor | Status | Evidence |
|-------------|--------|----------|
| Static variables storing metadata | ✅ None | No static fields in Stack, Renderer, or MetadataInjector |
| Class-level metadata cache | ✅ None | No class variables holding template references |
| Singleton pattern | ✅ None | Renderer and MetadataInjector are instantiated per-use |
| Global Map/cache of templates | ✅ None | Templates accessed via stack.getTemplate() |
| Closure variables capturing metadata | ✅ None | createInjector() factory receives fresh parameters |
| Mutation of shared template objects | ✅ None | Templates are read-only, cloneDeep used for resources |

## Code Audit: Shared State Search

**Files Reviewed:**
- `packages/kubricate/src/stack/Stack.ts` (Stack template storage)
- `packages/kubricate/src/stack/BaseStack.ts` (Stack build logic)
- `packages/kubricate/src/stack/ResourceComposer.ts` (Resource composition)
- `packages/kubricate/src/commands/generate/Renderer.ts` (Metadata injection orchestration)
- `packages/kubricate/src/commands/MetadataInjector.ts` (Metadata injection implementation)
- `packages/kubricate/src/executor/GenerateExecutor.ts` (Generation execution)

**Findings:**
- ✅ All metadata operations use instance properties
- ✅ No global state or singletons detected
- ✅ Loop iterations are properly scoped
- ✅ Template references are immutable and instance-bound

## Conclusion

**Status:** ✅ **VERIFIED - NO ISSUES**

The codebase correctly implements template metadata isolation through:

1. **Instance-scoped template references** - Each Stack stores its own `_template` property
2. **Per-stack metadata injection** - Renderer processes stacks in isolated loop iterations
3. **Fresh injector instances** - MetadataInjector created per-resource with correct template metadata
4. **Immutable data flow** - Template metadata passed by value, no mutation of shared objects
5. **No shared state** - Zero static variables, class-level caches, or global storage

**Recommendation:** No changes required. The current architecture guarantees that when generating multiple stacks from different templates, each rendered file receives its own template metadata without cross-contamination.

## Related Files

- Stack template storage: `packages/kubricate/src/stack/Stack.ts:76-80`
- Metadata injection loop: `packages/kubricate/src/commands/generate/Renderer.ts:91-110`
- Template retrieval: `packages/kubricate/src/commands/generate/Renderer.ts:53-59`
- Injector creation: `packages/kubricate/src/commands/generate/Renderer.ts:61-84`
- Metadata injection: `packages/kubricate/src/commands/MetadataInjector.ts:45-108`
