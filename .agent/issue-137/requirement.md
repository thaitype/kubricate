# Introduction

This requirement addresses the enhancement of metadata injection in Kubricate-generated Kubernetes resources. After the clarification of "Stack Template" terminology in PR #131, the current metadata structure needs to be updated to properly reflect the stack template concept and include additional useful metadata for better resource tracking and documentation.

# **Glossary**

- **Stack Template**: The blueprint or definition class that creates a Stack (e.g., SimpleAppStack, NamespaceStack)
- **Stack**: An instance created from a Stack Template with specific input parameters
- **Stack ID**: The unique identifier for a stack instance (e.g., `myApp`)
- **Resource ID**: The identifier for a specific resource within a stack (e.g., `deployment`, `service`)
- **Metadata Injection**: The process of adding labels and annotations to Kubernetes resources during manifest generation

# Requirement

## Functional Requirement

- **FR-1**: Update the metadata key `kubricate.thaitype.dev/stack-name` to `kubricate.thaitype.dev/stack-template-name` to reflect the Stack Template terminology clarified in PR #131
- **FR-2**: Add optional metadata field for organization name (`kubricate.thaitype.dev/org`)
- **FR-3**: Add optional metadata field for documentation URL (`kubricate.thaitype.dev/docs-url`)
- **FR-4**: Add optional metadata field for author name (`kubricate.thaitype.dev/author`)
- **FR-5**: Add optional metadata field for stack template version (`kubricate.thaitype.dev/stack-template-version`)
- **FR-6**: Maintain backward compatibility with existing metadata fields (stack-id, resource-id, version, resource-hash, managed-at)
- **FR-7**: Allow Stack Templates to define their own metadata through a metadata configuration API

## Non-Functional Requirement

- **NFR-1**: Metadata injection should not significantly impact manifest generation performance
- **NFR-2**: New metadata fields should follow Kubernetes label/annotation naming conventions
- **NFR-3**: Documentation should be updated to reflect the new metadata structure and how to configure optional fields
- **NFR-4**: The solution should maintain consistency across all providers and injection kinds

# Diagram/User Interface

**Before (Current State):**
```yaml
metadata:
  labels:
    kubricate.thaitype.dev: "true"
    kubricate.thaitype.dev/stack-id: myApp
    kubricate.thaitype.dev/resource-id: deployment
  annotations:
    kubricate.thaitype.dev/stack-name: SimpleApp
    kubricate.thaitype.dev/version: 0.20.1
    kubricate.thaitype.dev/resource-hash: ...
    kubricate.thaitype.dev/managed-at: ...
```

**After (Proposed State):**
```yaml
metadata:
  labels:
    kubricate.thaitype.dev: "true"
    kubricate.thaitype.dev/stack-id: myApp
    kubricate.thaitype.dev/resource-id: deployment
  annotations:
    kubricate.thaitype.dev/stack-template-name: SimpleAppStack
    kubricate.thaitype.dev/stack-template-version: 1.0.0
    kubricate.thaitype.dev/version: 0.20.1
    kubricate.thaitype.dev/resource-hash: ...
    kubricate.thaitype.dev/managed-at: ...
    kubricate.thaitype.dev/org: my-organization
    kubricate.thaitype.dev/docs-url: https://docs.example.com/stacks/simple-app
    kubricate.thaitype.dev/author: John Doe
```

# Acceptance Criteria

- **AC-1**: When generating manifests, the metadata key `kubricate.thaitype.dev/stack-name` is replaced with `kubricate.thaitype.dev/stack-template-name`
- **AC-2**: The stack template name value correctly reflects the actual template class name (e.g., `SimpleAppStack` instead of just `SimpleApp`)
- **AC-3**: Stack Templates can optionally define organization, docs URL, author, and template version through a configuration API
- **AC-4**: When optional metadata is configured, it appears in the generated manifests
- **AC-5**: When optional metadata is not configured, those fields are omitted from the manifests (not empty strings)
- **AC-6**: All existing metadata fields continue to work as before
- **AC-7**: Documentation is updated to explain the new metadata structure and configuration options
- **AC-8**: Tests verify that metadata injection works correctly with and without optional fields

# Testing for Dev

- Create a test stack with all optional metadata fields configured and verify the generated manifest contains all expected metadata
- Create a test stack without optional metadata fields and verify only the required metadata appears
- Verify that the stack-template-name correctly reflects the template class name
- Test with multiple stack templates to ensure metadata is correctly applied to each
- Run existing tests to ensure backward compatibility is maintained
- Test with different providers (OpaqueSecretProvider, DockerConfigSecretProvider) to ensure consistent metadata injection
- Verify that metadata appears correctly in all resource types (Deployment, Service, Secret, etc.)

# Q&A

- Requirement
    - **Q**: Should the old `kubricate.thaitype.dev/stack-name` key be kept for backward compatibility?
      **A**: This needs to be decided. Options: (1) Remove it entirely (breaking change), (2) Keep both keys temporarily with deprecation warning, (3) Keep both indefinitely

    - **Q**: Should optional metadata fields be labels or annotations?
      **A**: Typically, labels are for selectors and short values. Annotations are better for longer values like URLs and author names. Suggest using annotations for all new fields.

    - **Q**: How should Stack Templates define their metadata?
      **A**: Consider adding a static metadata property or method to Stack Template classes, or allow it to be passed in the template configuration.

- Technical
    - **Q**: Where in the codebase should metadata injection logic be modified?
      **A**: Likely in `packages/kubricate/src/stack/ResourceComposer.ts` or related resource composition logic

    - **Q**: Should stack template version be separate from the kubricate framework version?
      **A**: Yes, stack template version should be independent and defined by the stack template author
