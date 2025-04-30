# 🧠 Monorepo Maintenance Guide

This monorepo uses [Changesets](https://github.com/changesets/changesets) for **versioning**, **changelog generation**, and **releases**.

---

## 🧩 Package Structure

- `@kubricate/core` — shared utilities and types
- `@kubricate/stacks` — depends on `core`
- `@kubricate/toolkit` — independent tools
- `kubricate` — CLI tool (uses `core` only for setup config types)
- Future packages:
  - `@kubricate/env`, `@kubricate/secrets`, `@kubricate/azure-keyvault` → depend on `core`

---

## 🔄 Versioning Strategy

We use **fixed packages**, as you can see at `.changeset/config.json`:

```json
{
  "fixed": [["kubricate", "@kubricate/core", "@kubricate/env", "@kubricate/stacks", "@kubricate/kubernetes"]],
}
```

## 🛠 Making a Change
1. Run pnpm changeset
	Follow the prompt to select packages and write a summary.
2. Commit your changes including the .changeset file.
3. CI will:
   - Bump versions appropriately
   - Generate changelogs
   - Publish packages on merge (if configured)

## 📦 Guidelines
 - If a package uses @kubricate/core at runtime, declare it as a dependency.
 - If a package uses only types from core, declare it as a devDependency to avoid unnecessary releases.
 - Avoid changing version numbers manually — let Changesets handle it.

## 🔍 Need Help?
 - Refer to [.changeset/config.json](../.changeset/config.json) for versioning rules.
 - Read the [Changesets docs](https://github.com/changesets/changesets/blob/main/docs/config-file-options.md) for full options.

