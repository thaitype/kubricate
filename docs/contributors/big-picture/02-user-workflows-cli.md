# User Workflows & CLI Lifecycle

This guide shows what users actually run and in what order. Each workflow maps CLI commands to the five-step lifecycle: Configure → Validate → Prepare → Merge → Render/Apply.

**Who this is for**: Practitioners, CI/CD owners, and platform engineers designing deployment pipelines.

---

## How the Lifecycle Maps to Commands

Kubricate's CLI provides four primary commands that map directly to the lifecycle steps:

| Command | Lifecycle Steps | Purpose |
|---------|----------------|---------|
| `kubricate generate` | Configure → Validate → Prepare → Merge → Render | Generate Kubernetes YAML manifests |
| `kubricate secret validate` | Configure → Validate | Check all secrets exist and are loadable |
| `kubricate secret apply` | Configure → Validate → Prepare → Merge → Apply | Create/update Secret resources in cluster |
| `kubectl apply -f` | (external) | Deploy workloads that consume secrets |

**Key Insight**: `generate` and `secret apply` share the same preparation and merge logic. The difference is the final step — `generate` renders YAML, `secret apply` executes kubectl commands.

---

## Local Development Recipe

**Goal**: Fast feedback during infrastructure changes

```bash
# 1. Design and preview manifests
kubricate generate

# 2. Validate secrets exist (no cluster writes)
kubricate secret validate

# 3. Create/update Secret resources
kubricate secret apply

# 4. Deploy workloads
kubectl apply -f ./manifests
```

**Why This Order?**

Design YAML first to catch issues early. The `generate` command produces manifests you can inspect and diff before touching the cluster.

Validate secrets next to ensure all declared secrets exist in connectors. This fails fast if environment variables are missing.

Apply secrets before workloads reference them. Kubernetes Pods fail to start if Secrets don't exist. Creating Secrets first prevents deployment failures.

**Tip for Offline Work**:

Run steps 1-2 only. You can design infrastructure and validate configuration without a cluster connection. This is useful during initial development or when working offline.

---

## CI/CD Recipe

**Goal**: Artifact-first deployment with fail-fast validation

```bash
# 1. Fail fast on missing secrets
kubricate secret validate

# 2. Generate versioned manifests
kubricate generate

# 3. Publish artifacts
# (Attach to PR or push to artifact store)

# 4. Deploy secrets (in deploy job only)
kubricate secret apply
```

**Key Differences from Local Dev**:

Validation runs first to fail builds immediately if secrets are missing. This prevents generating and publishing invalid artifacts.

Secrets are applied only in deployment environments, not during the build phase. This separates build-time validation from runtime deployment, reducing the blast radius of CI failures.

**Example CI Pipeline**:

```yaml
# Build Job (runs on every commit)
- kubricate secret validate  # Fail fast
- kubricate generate         # Create artifacts
- Upload manifests to artifact store

# Deploy Job (runs on merge to main)
- Download artifacts
- kubricate secret apply     # Deploy secrets
- kubectl apply -f manifests # Deploy workloads
```

**Why Separate Jobs?**

Build jobs validate and generate. Deploy jobs apply changes. This separation enables artifact promotion across environments without rebuilding.

---

## GitOps Recipe

**Goal**: Pull-based deployment with Git as source of truth

```bash
# 1. Pre-flight validation (CI)
kubricate secret validate

# 2. Commit manifests (CI)
kubricate generate
git add manifests/ && git commit -m "Update manifests"

# 3. GitOps controller applies manifests
# ArgoCD or Flux watches repository

# 4. Apply secrets via:
# - Kubricate job/pipeline step
# - External secret operator
```

**Why Commit Manifests?**

GitOps controllers watch Git repositories for changes. Committing generated manifests makes them visible to the controller and creates an audit trail.

**Secret Handling in GitOps**:

You have two options:

1. **Kubricate Job** — Run `kubricate secret apply` in a separate pipeline step before the GitOps controller syncs
2. **External Secret Operator** — Use tools like External Secrets Operator (ESO) or Sealed Secrets to manage secrets declaratively

**Tip**: Use `outputMode: 'flat'` in your config to generate a single `stacks.yml` file. This simplifies GitOps diffs.

```typescript
export default defineConfig({
  generate: {
    outputMode: 'flat',  // Single file
    cleanOutputDir: true,
  },
});
```

---

## Decision Matrix

Choose commands based on your goal and environment:

| Goal | Command | Where | When |
|------|---------|-------|------|
| See diffs fast | `generate` | Local/CI | During development |
| Catch missing secrets early | `secret validate` | Local/CI | Before committing |
| Make secrets exist in cluster | `secret apply` | Deploy stage | Before workload deployment |
| Deploy workloads | `kubectl apply -f` | Deploy/GitOps | After secrets exist |

---

## Troubleshooting Quick Wins

**1. Workloads fail with "Secret not found"**

**Problem**: Deployed workloads before secrets.

**Fix**: Always run `kubricate secret apply` before `kubectl apply -f ./manifests`.

---

**2. "Secret validation failed: API_KEY not found"**

**Problem**: Environment variable missing from connector.

**Fix**: Check your `.env` file or environment. Run `kubricate secret validate` to identify missing secrets early.

---

**3. "Conflict at crossProvider level"**

**Problem**: Two providers generating resources with the same name.

**Fix**: Review your configuration. Either:
- Use different resource names for each provider
- Enable conflict resolution with `strategy: 'overwrite'` (not recommended for production)
- Combine secrets into a single provider

---

**4. Generated manifests don't reflect config changes**

**Problem**: Stale output directory or caching issue.

**Fix**: Enable `cleanOutputDir: true` in your config to remove old files before generation.

---

**5. "kubectl: command not found" during secret apply**

**Problem**: kubectl not installed or not in PATH.

**Fix**: Install kubectl and ensure it's accessible. Kubricate shells out to kubectl for Secret creation.

---

## Workflow Swimlane

```
User/CI          Commands             Orchestrator         Kubernetes
   │                │                      │                    │
   │──config────────▶                      │                    │
   │                │                      │                    │
   │──validate──────▶                      │                    │
   │                │──check config───────▶                     │
   │                │──load secrets───────▶                     │
   │◀──✓ or ✗───────┤                      │                    │
   │                │                      │                    │
   │──generate──────▶                      │                    │
   │                │──build resources────▶                     │
   │                │──prepare effects────▶                     │
   │                │──merge conflicts────▶                     │
   │◀──YAML files───┤                      │                    │
   │                │                      │                    │
   │──secret apply──▶                      │                    │
   │                │──prepare effects────▶                     │
   │                │──merge conflicts────▶                     │
   │                │──kubectl apply───────┼────────────────────▶
   │◀──✓ applied────┤                      │                    │
   │                │                      │                    │
   │──kubectl apply─┼──────────────────────┼────────────────────▶
   │◀──deployed─────┤                      │                    │
```

**Reading the Diagram**:

1. User provides config, CLI loads and validates
2. Generate command builds resources and writes YAML
3. Secret apply command creates Kubernetes Secret resources
4. User deploys workloads via kubectl (or GitOps controller)

---

## Where to Next

**Learn How Secrets Work**:
- [Secrets System Overview](./03-secrets-overview.md) — Deep dive on connectors, providers, and conflict resolution

**Understand Extension Points**:
- [Extensibility & Monorepo](./04-extensibility-and-monorepo.md) — How to build custom connectors and providers

**Explore Architecture**:
- [Architecture Overview](./01-architecture-overview.md) — System layers and design principles

**See Detailed Secret Docs**:
- [Secret Lifecycle](../secrets/02-lifecycle.md) — Step-by-step secret management
- [Validation Layers](../secrets/07-validation.md) — How Kubricate catches errors early
