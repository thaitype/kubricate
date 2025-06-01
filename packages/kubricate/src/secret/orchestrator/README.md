
## 🔁 RESPONSIBILITIES

| Layer                 | Responsibility                                   |
| --------------------- | ------------------------------------------------ |
| `SecretsOrchestrator` | Top-level CLI flow orchestration                 |
| `SecretManagerEngine` | SecretManager lifecycle (collect, load, prepare) |
| `SecretsMergeEngine`  | Value-level merging (multi-level strategy)       |
| `BaseProvider`        | Manifest generation + manifest-level merging     |
