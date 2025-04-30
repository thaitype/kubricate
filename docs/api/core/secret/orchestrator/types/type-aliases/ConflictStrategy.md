[Documentation](../../../../index.md) / [secret/orchestrator/types](../index.md) / ConflictStrategy

# Type Alias: ConflictStrategy

```ts
type ConflictStrategy = "overwrite" | "error" | "autoMerge";
```

Defines how secret conflict resolution is handled at different orchestration levels.

⚡ Key Concept:
Synthing and Kubricate only detect conflicts at the **logical object graph** level — not runtime cluster conflicts.

Conflict resolution occurs **before** output is materialized (e.g., Kubernetes manifests, GitHub matrices).

---

🎯 Available conflict strategies:
- `'overwrite'` — Always prefer the latest value (no error; optionally logs dropped values).
- `'error'` — Immediately throw an error on conflict (safe default for production).
- `'autoMerge'` — Shallow merge object structures if supported (fallback to latest value otherwise).
