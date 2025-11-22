# kubricate-local

**Internal tool for the Kubricate monorepo only. End users should use the main `kubricate` package.**

## Purpose

This package replicates the `generate-metadata` command from the main `kubricate` package to solve a circular dependency problem:

- `@kubricate/core` and `@kubricate/stacks` need to generate `metadata.gen.ts` files
- They cannot depend on `kubricate` package (would create circular dependency)
- `kubricate-local` provides the same command without depending on core/stacks

## Usage

### In Package Scripts

Add to any package that needs metadata generation:

```json
{
  "scripts": {
    "generate:metadata": "kubricate-local generate-metadata",
    "prepublishOnly": "pnpm generate:metadata"
  },
  "devDependencies": {
    "kubricate-local": "workspace:*"
  }
}
```

### Command Line

```bash
# Generate metadata.gen.ts in current directory
kubricate-local generate-metadata

# Generate with custom options
kubricate-local generate-metadata --cwd packages/core --outfile src/metadata.gen.ts

# Extract different field
kubricate-local generate-metadata --field customField
```

## Implementation Notes

- File system abstraction via IFileSystem (testable with InMemoryFileSystem)
- Identical logic to kubricate's GenerateMetadataCommand
- 77 tests covering all edge cases
- Private package (not published to npm)

## When to Use

- **Use kubricate-local:** Only in monorepo packages that are dependencies of `kubricate`
- **Use kubricate:** For all user-facing documentation and external packages