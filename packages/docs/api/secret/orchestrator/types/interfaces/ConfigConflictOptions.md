[Documentation](../../../../index.md) / [secret/orchestrator/types](../index.md) / ConfigConflictOptions

# Interface: ConfigConflictOptions

Full configuration for controlling **secret conflict handling** behavior.

---

Important Behavior:
- **intraProvider** (default: `'autoMerge'`) allows shallow merging within the same provider resource.
- **crossProvider** (default: `'error'`) forbids silent collisions between different providers.
- **crossManager** (default: `'error'`) forbids collisions across different SecretManagers.

Note:
- If stricter behavior is needed, `strict: true` will enforce all levels to `'error'` mode.
- Manifest-level validation (e.g., Kubernetes metadata.name conflicts) is handled separately after orchestration.

## Properties

### conflict?

```ts
optional conflict: object;
```

#### strategies?

```ts
optional strategies: object;
```

##### strategies.crossManager?

```ts
optional crossManager: ConflictStrategy;
```

Conflict resolution across **different SecretManagers** inside the system.

Example: frontendManager and backendManager both creating a Kubernetes Secret named 'app-credentials'.

(This is mainly relevant for Kubricate where stacks manage multiple managers; Synthing stays framework-agnostic.)

###### Default

```ts
'error'
```

##### strategies.crossProvider?

```ts
optional crossProvider: ConflictStrategy;
```

Conflict resolution across **different providers inside the same SecretManager**.

Example: collision between an EnvSecretProvider and VaultSecretProvider both trying to generate the same logical resource.

###### Default

```ts
'error'
```

##### strategies.intraProvider?

```ts
optional intraProvider: ConflictStrategy;
```

Conflict resolution for multiple secrets targeting the **same provider instance**.

Example: two environment variables injected into the same Kubernetes Secret.

###### Default

```ts
'autoMerge'
```

#### strict?

```ts
optional strict: boolean;
```

Enforces **strict conflict validation** globally across all levels.

When enabled:
- All conflict levels (`intraProvider`, `crossProvider`, `crossManager`) are forcibly treated as `'error'`.
- Any attempt to relax conflict (e.g., `'autoMerge'`) will cause a configuration validation error.

Recommended for production environments requiring strict secret isolation and no ambiguity in deployment artifacts.

##### Default

```ts
false
```
