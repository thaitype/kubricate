[Documentation](../../../../index.md) / [secret/orchestrator/types](../index.md) / ConflictLevel

# Type Alias: ConflictLevel

```ts
type ConflictLevel = keyof NonNullable<NonNullable<ConfigConflictOptions["conflict"]>["strategies"]>;
```

Defines the levels where secret conflicts can occur during orchestration.

These keys correspond to fine-grained areas inside the secret graph.
