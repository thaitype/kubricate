# Metadata & Determinism

Kubricate makes generated resources identifiable, traceable, and stable across runs. Metadata enables discovery, auditing, and drift detection.

**Who this is for**: Ops engineers and auditors concerned with traceability.

**You'll learn**: What metadata Kubricate injects, how hashing ensures determinism, and operational uses.

**Prerequisites**: Basic understanding of Kubernetes labels and annotations.

---

## Why Metadata Exists

Kubernetes clusters often contain hundreds of resources from multiple sources. Metadata answers critical operational questions:

**Discovery Questions**:
- Which resources did Kubricate create?
- Which stack owns this Deployment?
- What version of Kubricate generated this manifest?

**Audit Questions**:
- When was this resource last updated?
- Has the resource drifted from source?
- Can I trace this back to source code?

**Cleanup Questions**:
- How do I delete all Kubricate-managed resources?
- Which resources belong to a specific stack?

Kubricate injects labels and annotations to make these questions answerable via `kubectl` commands.

---

## Injected Fields

MetadataInjector adds consistent labels and annotations to all resources.

### Always Injected

**Label: `kubricate.thaitype.dev=true`**
- Marks resource as Kubricate-managed
- Enables bulk operations: `kubectl get all -l kubricate.thaitype.dev=true`

**Label: `kubricate.thaitype.dev/stack-id`**
- Stack identifier from config (e.g., `frontend`, `backend`)
- Enables stack-scoped queries: `kubectl get all -l kubricate.thaitype.dev/stack-id=frontend`

**Annotation: `kubricate.thaitype.dev/stack-name`**
- Human-readable stack name (e.g., `WebApp`, `CronJob`)
- Helps identify stack type during inspection

**Label: `kubricate.thaitype.dev/resource-id`**
- Resource identifier within stack (e.g., `deployment`, `service`)
- Enables resource-specific queries

### Optional (Configurable)

**Annotation: `kubricate.thaitype.dev/version`**
- Kubricate CLI version that generated the manifest
- Useful for debugging version-specific issues
- Enable via: `metadata.injectVersion: true`

**Annotation: `kubricate.thaitype.dev/resource-hash`**
- SHA-256 hash of resource contents
- Enables drift detection
- Enable via: `metadata.injectResourceHash: true`

**Annotation: `kubricate.thaitype.dev/managed-at`**
- ISO 8601 timestamp of generation
- Tracks when manifest was last updated
- Enable via: `metadata.injectManagedAt: true`

---

## Example: Before & After

### Before Metadata Injection

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: app
        image: myregistry/frontend:v1.0.0
```

### After Metadata Injection

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  labels:
    kubricate.thaitype.dev: "true"
    kubricate.thaitype.dev/stack-id: webApp
    kubricate.thaitype.dev/resource-id: deployment
  annotations:
    kubricate.thaitype.dev/stack-name: WebApp
    kubricate.thaitype.dev/version: 0.21.0
    kubricate.thaitype.dev/managed-at: "2025-01-15T10:30:00.000Z"
    kubricate.thaitype.dev/resource-hash: a3f2b...7c8d
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: app
        image: myregistry/frontend:v1.0.0
```

**What Changed**:
- Added 3 labels for discovery
- Added 4 annotations for traceability
- No functional changes (Kubernetes behavior unchanged)

---

## Hashing Mechanism

Resource hashing enables drift detection by producing deterministic fingerprints.

### Hash Calculation Process

```
1. Clean resource (remove runtime fields)
      ↓
2. Sort keys recursively (deterministic ordering)
      ↓
3. Serialize to JSON
      ↓
4. SHA-256 hash
      ↓
5. 64-character hex string
```

### What's Excluded

Kubricate removes Kubernetes runtime fields before hashing:

**Excluded Fields**:
- `metadata.creationTimestamp`
- `metadata.resourceVersion`
- `metadata.uid`
- `metadata.selfLink`
- `metadata.generation`
- `metadata.managedFields`

**Why Exclude**: These fields change every time Kubernetes processes a resource, making hashes non-deterministic.

### Hash Stability

**Same resource → Same hash** (across multiple runs):
```typescript
// Run 1
kubricate generate
// deployment hash: a3f2b...7c8d

// Run 2 (no config changes)
kubricate generate
// deployment hash: a3f2b...7c8d  ✓ Identical
```

**Changed resource → Different hash**:
```typescript
// Change replicas: 3 → 5
kubricate generate
// deployment hash: b7e9c...2f1a  ✓ Different
```

---

## Operational Uses

Metadata enables powerful operational workflows.

### 1. Drift Detection

Compare resource hashes between generated manifests and cluster state:

```bash
# Generate new manifests
kubricate generate

# Get deployed resource hash
kubectl get deployment frontend -o json \
  | jq -r '.metadata.annotations["kubricate.thaitype.dev/resource-hash"]'
# Output: a3f2b...7c8d

# Compare with generated manifest
grep "resource-hash" output/webApp.yml
# Output: kubricate.thaitype.dev/resource-hash: a3f2b...7c8d

# ✓ Hashes match → no drift
# ✗ Hashes differ → drift detected
```

### 2. Targeted Cleanup

Delete all resources from a specific stack:

```bash
kubectl delete all -l kubricate.thaitype.dev/stack-id=frontend
```

Delete all Kubricate-managed resources:

```bash
kubectl delete all -l kubricate.thaitype.dev=true
```

### 3. Version Traceability

Find resources generated by a specific Kubricate version:

```bash
kubectl get all -o json \
  | jq -r '.items[] | select(.metadata.annotations["kubricate.thaitype.dev/version"] == "0.21.0") | .metadata.name'
```

### 4. Stack Discovery

List all stacks in a namespace:

```bash
kubectl get all -o json \
  | jq -r '.items[].metadata.labels["kubricate.thaitype.dev/stack-id"]' \
  | sort -u
```

### 5. Audit Trail

Track when resources were last updated:

```bash
kubectl get deployment frontend -o json \
  | jq -r '.metadata.annotations["kubricate.thaitype.dev/managed-at"]'
# Output: 2025-01-15T10:30:00.000Z
```

---

## Configuration Knobs

Control metadata injection via `kubricate.config.ts`:

```typescript
import { defineConfig } from 'kubricate';

export default defineConfig({
  stacks: { /* ... */ },

  metadata: {
    // Enable/disable all metadata injection
    inject: true,  // Default: true

    // Optional fields (false by default)
    injectVersion: true,
    injectResourceHash: true,
    injectManagedAt: true,
  },
});
```

### When to Disable

**Disable `inject: false`**:
- Generating manifests for tools that don't support labels/annotations
- Minimizing manifest size
- Testing without metadata noise

**Disable `injectManagedAt: false`**:
- When timestamps cause unnecessary git diffs
- When drift detection only needs hash comparison

**Disable `injectResourceHash: false`**:
- When hash calculation is too expensive
- When drift detection is handled externally

---

## Cross-Link

**Final step: Rendering and output modes** — See [YAML Rendering & Output Modes](./06-rendering-and-output.md) to understand how resources become files and how to organize output for CI/GitOps.

**Further Reading**:
- [Generate Overview](./01-generate-overview.md) — Complete generate workflow
- [User Workflows](../big-picture/02-user-workflows-cli.md) — CI/CD patterns
- [Architecture Overview](../big-picture/01-architecture-overview.md) — System design
