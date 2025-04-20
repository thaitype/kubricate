# 🔐 Secrets Conflict Handling (Kubricate/Synthing)

## ✨ Overview

In Kubricate and Synthing, **all secret conflicts are detected and resolved during orchestration** — **before** any YAML, JSON, or manifest is generated.

✅ Safe: No broken manifests.  
✅ Deterministic: No runtime surprises.  
✅ Flexible: Controlled merging via strategies.

---

## 🧠 How Conflicts Are Detected

Secrets are grouped by a **canonical conflict key**:

```plaintext
{secretType}:{identifier}
```

| Part       | Meaning                               | Example              |
| :--------- | :------------------------------------ | :------------------- |
| secretType | Logical type provided by the Provider | `Kubricate.InMemory` |
| identifier | Target resource name or path          | `app-credentials`    |

> 📋 Manager name is no longer part of the conflict key. Cross-manager merging is controlled by strategy.

---

## 🔥 Conflict Levels and Default Behavior

| Level           | Default Strategy | Description                                                | Example                                 |
| :-------------- | :--------------- | :--------------------------------------------------------- | :-------------------------------------- |
| `intraProvider` | `autoMerge`      | Conflicts within the same provider inside the same manager | Merge two keys into a Kubernetes Secret |
| `crossProvider` | `error`          | Conflicts across providers within the same manager         | Env vs Vault creating the same Secret   |
| `crossManager`  | `error`          | Conflicts across different SecretManagers                  | Frontend vs Backend Secrets             |

Conflict resolution depends on configured strategies or strict mode settings.

---

## 🛠 Conflict Resolution Strategies

| Strategy    | Behavior                                                         |
| :---------- | :--------------------------------------------------------------- |
| `error`     | Throw immediately when conflict detected                         |
| `overwrite` | Keep the last declared secret, warn about others being dropped   |
| `autoMerge` | Merge shallow secret data (only if `provider.allowMerge` = true) |

---

## ⚙️ Configuration Options

```ts
export interface ConfigConflictOptions {
  conflict?: {
    strategies?: {
      intraProvider?: ConflictStrategy;
      crossProvider?: ConflictStrategy;
      crossManager?: ConflictStrategy;
    };
    strict?: boolean;
  };
}
```

Where:

- `ConflictStrategy = 'error' | 'overwrite' | 'autoMerge'`
- `strict: true` → Enforces `error` strategy for all levels unless explicitly overridden.

---

## 📚 Example: Conflict In Action

Suppose two secrets are defined:

```plaintext
Kubricate.InMemory:app-credentials
```

One from `svc1`, another from `svc2`.

Depending on `crossManager` strategy:

| Strategy    | Result                                               |
| :---------- | :--------------------------------------------------- |
| `error`     | ❌ Throw immediately                                  |
| `overwrite` | ⚠️ Keep one, warn about the others being dropped      |
| `autoMerge` | ✅ Merge secret contents (if provider allows merging) |

---

## 🚨 Important Notes

- Conflict detection happens at the **orchestration layer**, not runtime.
- Manifest validation (later) is used only for **non-secret resources** (e.g., Deployments, Services).
- No silent merging unless explicitly configured (`autoMerge`).
- Enabling `strict: true` is highly recommended for production environments.

---

## 📦 Recommended: Strict Conflict Mode

```ts
import { defineConfig } from 'kubricate';

export default defineConfig({
  secrets: {
    conflict: {
      strict: true, // ✅ Safer defaults
    },
  },
  stacks: { /* ... */ },
});
```

✅ Ensures immediate failure on unexpected conflicts.

---

## 🧠 Why This Design?

| Benefit                     | Why It Matters                                             |
| :-------------------------- | :--------------------------------------------------------- |
| Early detection             | Catch errors before deployment                             |
| Deterministic outputs       | No runtime patching or unpredictable merging               |
| Logical graph orchestration | Secrets are merged at the right logical level              |
| Clear separation of concern | Manifest validation focuses only on runtime cluster issues |

---

## 📢 TL;DR

✅ Secrets are grouped by `{secretType}:{identifier}`.  
✅ Cross-manager merging is strategy-controlled.  
✅ No dynamic merging happens post-orchestration.  
✅ Strict mode is available and recommended.
