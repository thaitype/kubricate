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

#!/bin/bash
set -euo pipefail

echo "Regenerating metadata.gen.ts files..."
pnpm generate:metadata

# Check if there are any changes to metadata.gen.ts files
if git diff --quiet '**/metadata.gen.ts'; then
  echo "No changes to metadata.gen.ts files"
  exit 0
fi

echo "Detected changes in metadata.gen.ts files:"
git diff --name-only '**/metadata.gen.ts'

# Stage the metadata files
git add '**/metadata.gen.ts'

# Check if there are staged changes
if git diff --cached --quiet; then
  echo "No staged changes to commit"
  exit 0
fi

# Amend the previous commit (the version commit) instead of creating a new one
git commit --amend --no-edit

echo "✓ Metadata changes added to the version commit"