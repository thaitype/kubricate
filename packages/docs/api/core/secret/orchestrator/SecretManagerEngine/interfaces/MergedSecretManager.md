[Documentation](../../../../index.md) / [secret/orchestrator/SecretManagerEngine](../index.md) / MergedSecretManager

# Interface: MergedSecretManager

MergedSecretManager maps SecretManager instances at the project level.

For now, Kubricate supports only one SecretManager per project (via config.secrets.manager),
so this structure holds exactly one manager under the 'default' key.

## Indexable

```ts
[secretManagerName: string]: object
```
