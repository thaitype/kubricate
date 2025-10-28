# End-to-End Lifecycle

Follow a single secret from configuration to deployment. This page traces `DB_PASSWORD` through every phase of Kubricate's secret management system.

## The Five Phases

```mermaid
graph LR
    A[1. Configure] --> B[2. Validate]
    B --> C[3. Prepare]
    C --> D[4. Merge]
    D --> E[5. Execute]

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#d4edda
    style D fill:#ffe1e1
    style E fill:#e1ffe1
```

### Phase 1: Configure

**Where:** `kubricate.config.ts`

**What happens:** You declare connectors, providers, and secrets.

```typescript
import { defineConfig, SecretManager } from 'kubricate';
import { EnvConnector } from '@kubricate/plugin-env';
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes';

const secretManager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('opaque', new OpaqueSecretProvider({
    name: 'app-secret',
    namespace: 'production',
  }))
  .addSecret({ name: 'DB_PASSWORD' });

export default defineConfig({
  secrets: {
    secretSpec: secretManager,
  },
  stacks: { /* ... */ },
});
```

**Key points:**
- EnvConnector loads secrets from environment variables (prefixed with `KUBRICATE_SECRET_`)
- OpaqueSecretProvider formats them as standard Kubernetes Secrets
- `addSecret()` declares that `DB_PASSWORD` exists and must be loaded

### Phase 2: Validate

**Command:** `kubricate secret validate`

**What happens:** The Orchestrator checks configuration and loads all secrets to verify they exist.

```mermaid
sequenceDiagram
    participant CLI
    participant Orchestrator
    participant Manager
    participant Connector

    CLI->>Orchestrator: validate()
    Orchestrator->>Manager: getSecrets()
    Manager-->>Orchestrator: ['DB_PASSWORD']
    Orchestrator->>Connector: load(['DB_PASSWORD'])
    Connector->>Connector: Check process.env.KUBRICATE_SECRET_DB_PASSWORD
    alt Secret exists
        Connector-->>Orchestrator: ✓ Loaded
        Orchestrator-->>CLI: ✓ Valid
    else Secret missing
        Connector-->>Orchestrator: ✗ Error
        Orchestrator-->>CLI: ✗ Missing secret
    end
```

**Example success:**
```bash
$ export KUBRICATE_SECRET_DB_PASSWORD="postgres://..."
$ kubricate secret validate
✓ All secrets validated successfully
```

**Example failure:**
```bash
$ kubricate secret validate
✗ Missing environment variable: KUBRICATE_SECRET_DB_PASSWORD
```

**Key points:**
- No secrets are written yet — only existence is checked
- Fails fast if any secret is missing
- Runs automatically before `kubricate generate` and `kubricate secret apply`

### Phase 3: Prepare

**Command:** `kubricate secret apply` (includes validation)

**What happens:** Each provider converts secret values into PreparedEffects.

```typescript
// Internal orchestrator flow:
const value = connector.get('DB_PASSWORD');
// value = "postgres://user:pass@host:5432/db"

const effects = provider.prepare('DB_PASSWORD', value);
// effects = [{
//   type: 'kubectl',
//   secretName: 'DB_PASSWORD',
//   providerName: 'opaque',
//   value: {
//     apiVersion: 'v1',
//     kind: 'Secret',
//     metadata: {
//       name: 'app-secret',
//       namespace: 'production',
//     },
//     type: 'Opaque',
//     data: {
//       DB_PASSWORD: 'cG9zdGdyZXM6Ly91c2VyOnBhc3NAaG9zdDo1NDMyL2Ri' // base64
//     }
//   }
// }]
```

**Key points:**
- `prepare()` performs provider-specific validation (format, required keys)
- Values are base64-encoded for Kubernetes
- Multiple secrets targeting the same provider create multiple effects (merged later)

### Phase 4: Merge

**What happens:** Orchestrator groups effects by conflict key and applies merge strategies.

```mermaid
graph TD
    A[Raw Effects] --> B{Same provider?<br/>Same resource?}
    B -->|Yes| C[Group by conflict key]
    C --> D{Conflict strategy?}
    D -->|autoMerge| E[provider.mergeSecrets]
    D -->|error| F[Throw error]
    D -->|overwrite| G[Keep last]
    E --> H[Merged Effect]
    G --> H
    B -->|No| H
```

**Example:** Two secrets, one provider.

```typescript
const manager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('opaque', new OpaqueSecretProvider({ name: 'app-secret' }))
  .addSecret({ name: 'DB_PASSWORD' })
  .addSecret({ name: 'API_KEY' });
```

**Before merge:**
```
Effect 1: { kind: 'Secret', data: { DB_PASSWORD: '...' } }
Effect 2: { kind: 'Secret', data: { API_KEY: '...' } }
```

**After merge:**
```
Effect: { kind: 'Secret', data: { DB_PASSWORD: '...', API_KEY: '...' } }
```

**Key points:**
- Default strategy is `autoMerge` for same-provider conflicts
- Prevents duplicate Kubernetes Secrets with overlapping names
- Cross-provider conflicts default to `error` (safe)

### Phase 5: Execute

**What happens:** Effects are applied to the cluster or injected into manifests.

#### For `kubricate secret apply`:

```bash
$ kubricate secret apply
✓ Applied Secret production/app-secret
```

Equivalent to:
```bash
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
  namespace: production
type: Opaque
data:
  DB_PASSWORD: cG9zdGdyZXM6Ly8uLi4=
  API_KEY: c2VjcmV0LWtleS12YWx1ZQ==
EOF
```

#### For `kubricate generate`:

Secrets are injected into Stack resources via `useSecrets()`:

```typescript
stack.useSecrets(secretManager, c => {
  c.secrets('DB_PASSWORD')
    .forName('DATABASE_URL')
    .inject('env');
});
```

**Generated YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secret
                  key: DB_PASSWORD
```

**Key points:**
- `kubricate secret apply` creates Secrets in the cluster
- `kubricate generate` references those Secrets in Deployments/Pods
- Both use the same configuration

## Complete Lifecycle Summary

| Phase | Input | Process | Output |
|-------|-------|---------|--------|
| **1. Configure** | User code | Register connectors, providers, secrets | SecretManager |
| **2. Validate** | SecretManager | Load all secrets, check existence | ✓ or ✗ |
| **3. Prepare** | Secret values | Call `provider.prepare()` | PreparedEffect[] |
| **4. Merge** | PreparedEffect[] | Group by key, apply strategy | Final effects |
| **5. Execute** | Final effects | `kubectl apply` or inject | Kubernetes resources |

## CLI Command Mapping

| Command | Phases Executed |
|---------|-----------------|
| `kubricate secret validate` | Configure → Validate |
| `kubricate secret apply` | Configure → Validate → Prepare → Merge → Execute (kubectl) |
| `kubricate generate` | Configure → Validate → Execute (injection) |

## Hello Secret Example

Here's a minimal end-to-end example:

**1. Create `.env` file:**
```bash
KUBRICATE_SECRET_DB_PASSWORD=postgres://localhost/mydb
```

**2. Configure in `kubricate.config.ts`:**
```typescript
import { defineConfig, SecretManager } from 'kubricate';
import { EnvConnector } from '@kubricate/plugin-env';
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes';

const secretManager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('opaque', new OpaqueSecretProvider({ name: 'app-secret' }))
  .addSecret({ name: 'DB_PASSWORD' });

export default defineConfig({
  secrets: { secretSpec: secretManager },
  stacks: { /* ... */ },
});
```

**3. Validate:**
```bash
$ kubricate secret validate
✓ All secrets validated successfully
```

**4. Apply:**
```bash
$ kubricate secret apply
✓ Applied Secret default/app-secret
```

**5. Verify:**
```bash
$ kubectl get secret app-secret -o yaml
apiVersion: v1
kind: Secret
type: Opaque
data:
  DB_PASSWORD: cG9zdGdyZXM6Ly9sb2NhbGhvc3QvbXlkYg==
```

This secret now exists in your cluster and can be referenced by Pods.

## What's Next

Now that you understand the lifecycle, let's define the core building blocks in detail.

**Next →** [Core Concepts](./03-core-concepts.md)

**Related:**
- [Validation](./07-validation.md) — Error handling at each phase
- [Conflicts & Merging](./08-conflicts-merging.md) — Phase 4 in depth
- [Injection Strategies](./06-injection-strategies.md) — Phase 5 injection options
