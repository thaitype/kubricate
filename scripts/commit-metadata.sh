#!/usr/bin/env bash
set -euo pipefail

# 1. Regenerate all metadata.gen.ts files across all packages
pnpm generate:metadata

# 2. Check whether metadata.gen.ts has changed
CHANGED_FILES="$(git status --porcelain -- '**/metadata.gen.ts' || true)"

if [ -z "$CHANGED_FILES" ]; then
  echo "No metadata.gen.ts changes detected. Skipping commit."
  exit 0
fi

echo "Detected changes in metadata.gen.ts:"
echo "$CHANGED_FILES"

# 3. Stage the changed files
git add -- '**/metadata.gen.ts'

# Double-check that staging actually contains changes
if git diff --cached --quiet; then
  echo "No staged changes to commit. Skipping commit."
  exit 0
fi

# 4. Commit
git commit -m "chore: regenerate metadata.gen.ts"

echo "Committed updated metadata.gen.ts files."