# 🧠 Monorepo Maintenance Guide

This monorepo uses [Changesets](https://github.com/changesets/changesets) for **versioning**, **changelog generation**, and **package publishing**.

## 🧩 Package Structure

- `@kubricate/core` — shared contracts, base classes, and orchestration types
- `@kubricate/stacks` — depends on `core`, contains official reusable stacks
- `@kubricate/toolkit` — lightweight utilities (independent)
- `kubricate` — CLI entrypoint (tightly coupled with `core`)
- Plugin packages:
  - `@kubricate/plugin-env` — connector for `.env`
  - `@kubricate/plugin-kubernetes` — provider for Kubernetes secrets
  - Future: `@kubricate/plugin-keyvault`, `@kubricate/plugin-helm`

## 🔄 Versioning Strategy

We use **fixed versioning** only for core packages that are tightly coupled:

```jsonc
"fixed": [[
  "kubricate",
  "@kubricate/core",
  "@kubricate/stacks"
]]
```

All other packages (e.g., `@kubricate/plugin-*`) are versioned independently. This avoids unnecessary bumps and allows plugins to evolve at their own pace.

## 🔧 Dependency Boundaries

- If a package **calls or extends `@kubricate/core` at runtime**, use `core` as a **dependency**.
- If it only uses **types or interfaces** (e.g., `BaseConnector`, `BaseProvider`), use `core` as a **peerDependency + devDependency**.

This avoids nested versions of `core` and ensures semver consistency across shared contracts.

## 🛠 Making a Change

1. Run `pnpm changeset`
   - Follow the prompts to select affected packages and describe the change.
2. Commit the changes including the generated `.changeset/*.md` file.
3. When merged, CI will:
   - Bump versions based on the changeset
   - Generate changelogs
   - Publish to npm (if configured)

## 📦 Guidelines

- Do **not** change version numbers manually — Changesets handles this.
- Always prefer `peerDependencies` when depending on core abstractions.
- If you're unsure whether to group versioning, check `.changeset/config.json`.

## 🔍 Need Help?

- Review [.changeset/config.json](../.changeset/config.json) for current rules
- See [Changesets documentation](https://github.com/changesets/changesets/blob/main/docs/config-file-options.md) for configuration details

