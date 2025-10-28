# YAML Rendering & Output Modes

Kubricate converts resources to YAML and organizes output based on your workflow. Choose output modes that fit local development, CI, or GitOps patterns.

**Who this is for**: Anyone producing or structuring generated manifests.

**You'll learn**: How resources become YAML, file organization strategies, and troubleshooting common rendering issues.

**Prerequisites**: Understanding of [Generate Overview](./01-generate-overview.md).

---

## Rendering Pipeline

The Renderer orchestrates the transformation from built resources to YAML files.

### Pipeline Steps

```
Resources (objects)
      ↓
MetadataInjector.inject()
      ↓
Resources + metadata
      ↓
YAML.stringify()
      ↓
YAML strings + '---\n'
      ↓
Group by output path
      ↓
GenerateRunner.run()
      ↓
Files written to disk
```

### Components

**Renderer**:
- Builds all stacks via `stack.build()`
- Injects metadata via MetadataInjector
- Converts to YAML via `yaml.stringify()`
- Resolves output paths based on mode

**GenerateRunner**:
- Cleans output directory (optional)
- Writes files to disk or stdout
- Displays generation summary

---

## Output Modes

Kubricate supports three output modes for different workflows.

### Mode Comparison

| Mode | File Structure | Use Case | Example Output |
|------|---------------|----------|----------------|
| `stack` | One file per stack | Most common, GitOps-friendly | `frontend.yml`, `backend.yml` |
| `resource` | One file per resource | Granular control, separate reviews | `frontend/Deployment_deployment.yml` |
| `flat` | All resources in one file | Small projects, single deploy | `stacks.yml` |

### Mode: `stack` (Default)

**Structure**: One file per stack, all resources in that file

```
output/
├── frontend.yml
│   ├── Deployment (deployment)
│   └── Service (service)
├── backend.yml
│   ├── Deployment (deployment)
│   └── Service (service)
└── cronJob.yml
    └── CronJob (job)
```

**When to Use**:
- Most projects
- GitOps workflows (ArgoCD, Flux)
- Stack-level deployments

**Example File**:
```yaml
# output/frontend.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  # ...
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  # ...
```

### Mode: `resource`

**Structure**: Directory per stack, file per resource

```
output/
├── frontend/
│   ├── Deployment_deployment.yml
│   └── Service_service.yml
├── backend/
│   ├── Deployment_deployment.yml
│   └── Service_service.yml
└── cronJob/
    └── CronJob_job.yml
```

**When to Use**:
- Large projects with many resources
- Granular review workflows (one PR per resource)
- Fine-grained rollout control

**File Naming**: `{Kind}_{resourceId}.yml`

### Mode: `flat`

**Structure**: All stacks and resources in one file

```
output/
└── stacks.yml
    ├── Deployment (frontend.deployment)
    ├── Service (frontend.service)
    ├── Deployment (backend.deployment)
    ├── Service (backend.service)
    └── CronJob (cronJob.job)
```

**When to Use**:
- Small projects (< 10 resources)
- Single deployment unit
- Simple kubectl apply workflows

**Example File**:
```yaml
# output/stacks.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  # ...
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  # ...
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  # ...
```

---

## Filtering

The `--filter` flag enables selective output for debugging and piping to kubectl.

### Filter Syntax

**By Stack ID**:
```bash
kubricate generate --stdout --filter frontend
```

**By Resource ID**:
```bash
kubricate generate --stdout --filter frontend.deployment
```

**Multiple Filters**:
```bash
kubricate generate --stdout --filter frontend backend
```

### Filter Behavior

**Matching**:
- Stack ID matches all resources in that stack
- Resource ID matches specific resource (format: `stackId.resourceId`)

**Validation**:
- Unmatched filters throw error
- Error message lists available stacks and resources

**Constraint**: `--filter` requires `--stdout` (cannot filter when writing to disk)

### Example Output

```bash
kubricate generate --stdout --filter frontend.deployment
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  labels:
    kubricate.thaitype.dev: "true"
    kubricate.thaitype.dev/stack-id: frontend
    kubricate.thaitype.dev/resource-id: deployment
  annotations:
    kubricate.thaitype.dev/stack-name: WebApp
spec:
  replicas: 3
  # ...
```

### Use Cases

**Quick Deploy**:
```bash
kubricate generate --stdout --filter frontend | kubectl apply -f -
```

**Debugging**:
```bash
kubricate generate --stdout --filter backend.service | less
```

**Diff Single Resource**:
```bash
kubricate generate --stdout --filter backend.deployment > new.yml
kubectl get deployment backend -o yaml > current.yml
diff current.yml new.yml
```

---

## CI/GitOps Tips

Optimize generate output for automated workflows.

### Write to `./manifests`

Standard convention for GitOps repositories:

```typescript
export default defineConfig({
  generate: {
    outputDir: 'manifests',
    outputMode: 'stack',
    cleanOutputDir: true,
  },
});
```

### Commit Artifacts for ArgoCD/Flux

```bash
# CI pipeline
kubricate generate
git add manifests/
git commit -m "Update manifests"
git push origin main
```

**Benefits**:
- ArgoCD/Flux watch repository for changes
- Git history tracks manifest evolution
- Easy rollback via git revert

### Clean Output Directory

Enable `cleanOutputDir` to remove stale files:

```typescript
generate: {
  cleanOutputDir: true,  // Removes old files before generation
}
```

**Why?**
- Prevents leftover files from deleted stacks
- Ensures output matches current config exactly

**Example**:
```
Before: output/oldStack.yml (from previous run)
After generate: output/ contains only current stacks
```

### Use `flat` Mode for Single Deploys

For simple CI pipelines that deploy everything at once:

```typescript
generate: {
  outputMode: 'flat',
}
```

```bash
kubectl apply -f output/stacks.yml
```

---

## Troubleshooting

Common rendering issues and solutions.

### Invalid YAML Indentation

**Symptom**: `kubectl apply` fails with YAML parse errors

**Cause**: Kubernetes models not serialized correctly

**Solution**: Use `kubeModel()` helper to ensure valid serialization:
```typescript
import { kubeModel } from '@kubricate/kubernetes-models';

// Good
const deployment = kubeModel(Deployment, { /* ... */ });

// Bad (may cause issues)
const deployment = new Deployment({ /* ... */ }).toJSON();
```

### Missing Metadata

**Symptom**: Resources lack Kubricate labels/annotations

**Cause**: Metadata injection disabled

**Solution**: Enable in config:
```typescript
metadata: {
  inject: true,
}
```

### Hash Mismatch Warnings

**Symptom**: Resource hash changes between identical runs

**Cause**: Non-deterministic config (e.g., timestamps, random values)

**Solution**: Remove non-deterministic values:
```typescript
// Bad
metadata: {
  annotations: {
    timestamp: new Date().toISOString(),  // ✗ Changes every run
  }
}

// Good
// Kubricate handles managedAt via metadata.injectManagedAt
```

### Empty Output Directory

**Symptom**: `output/` directory empty after generate

**Cause**: No stacks defined in config or all stacks filtered out

**Solution**: Check `config.stacks` is populated:
```typescript
export default defineConfig({
  stacks: {
    myApp: Stack.fromTemplate(/* ... */),
  },
});
```

### File Write Permissions

**Symptom**: `EACCES: permission denied` errors

**Cause**: Output directory not writable

**Solution**:
```bash
# Fix permissions
chmod +w output/

# Or specify different directory
kubricate generate --outDir ./build
```

---

## Cross-Links

**Back to Architecture**: Understand the full system design in [Architecture Overview](../big-picture/01-architecture-overview.md).

**Command Flows**: See how generate fits into deployment workflows in [User Workflows & CLI](../big-picture/02-user-workflows-cli.md).

**Secrets Deep Dive**: Learn about secret management in [Secrets System Overview](../big-picture/03-secrets-overview.md).

**Further Reading**:
- [Generate Overview](./01-generate-overview.md) — Complete generate workflow
- [Stacks & Templates](./02-stacks-and-templates.md) — Defining reusable patterns
- [Metadata & Determinism](./05-metadata-and-determinism.md) — Traceability and hashing
- [Testing Guide](../secrets/10-testing-best-practices.md) — Testing infrastructure code
