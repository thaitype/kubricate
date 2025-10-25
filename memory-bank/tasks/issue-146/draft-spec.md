### Goal

Provide a provider that:

* Validates and materializes `kubernetes.io/ssh-auth` Secrets.
* Supports **two injection strategies**: per-key environment variables (`env`) and bulk injection (`envFrom`) with consistent validations identical in spirit to `BasicAuthSecretProvider`.
* Plays nicely with your merge handler and overall provider API.

---

## Data model and validation

**Secret type:** `kubernetes.io/ssh-auth`

**Allowed keys**

* **Required:** `ssh-privatekey` (string)
* **Optional:** `known_hosts` (string)

**Zod schema**

```ts
export const sshAuthSecretSchema = z.object({
  'ssh-privatekey': z.string().min(1, 'ssh-privatekey is required'),
  known_hosts: z.string().optional(),
});
```

**Encoding**

* All provided keys are **Base64 encoded** before being placed in `.data`.

---

## Config interface

```ts
export interface SshAuthSecretProviderConfig {
  /** Secret name to create or reference */
  name: string;
  /** Namespace to place the Secret in (default: 'default') */
  namespace?: string;
}
```

---

## Provider metadata and capabilities

* `readonly secretType = 'Kubernetes.Secret.SshAuth'`
* `readonly targetKind = 'Deployment'`
* `readonly supportedStrategies: Array<'env' | 'envFrom'> = ['env', 'envFrom']`
* `readonly allowMerge = true` (should use `createKubernetesMergeHandler()` exactly like others)

---

## API behavior

### `getTargetPath(strategy)`

* For `{ kind: 'env', containerIndex? }`
  default: `spec.template.spec.containers[<index or 0>].env`
* For `{ kind: 'envFrom', containerIndex? }`
  default: `spec.template.spec.containers[<index or 0>].envFrom`
* If `strategy.targetPath` is provided, **use it as-is**.
* For any other kind, **throw**:
  `"[SshAuthSecretProvider] Unsupported injection strategy: <kind>"`

### `getEffectIdentifier(effect)`

* Return `"${namespace || 'default'}/${name}"` from `effect.value.metadata`.

### `prepare(secretName: string, value: SecretValue)`

* Parse with `sshAuthSecretSchema` using `parseZodSchema`.
* Build a single `PreparedEffect` of `type: 'kubectl'` with:

  * `apiVersion: 'v1'`
  * `kind: 'Secret'`
  * `metadata.name = config.name`
  * `metadata.namespace = config.namespace ?? 'default'`
  * `type = 'kubernetes.io/ssh-auth'`
  * `data = { 'ssh-privatekey': Base64.encode(value['ssh-privatekey']), ...(known_hosts && { known_hosts: Base64.encode(known_hosts) }) }`
* Set `secretName` and `providerName` like your other providers.

### `mergeSecrets(effects)`

* Use `createKubernetesMergeHandler()` exactly like others.
  This preserves identical duplicate-key conflict semantics across providers.

---

## Injection behavior

### General homogeneity rule (same as BasicAuth)

* All `ProviderInjection[]` passed to `getInjectionPayload()` **must use the same `strategy.kind`**.
* If mixed kinds are detected (for example, some `env`, some `envFrom`), **throw** with a message that:

  * Names the detected kinds (e.g., `env, envFrom`).
  * Hints at “framework bug or incorrect targetPath configuration”.

### `getInjectionPayload(injectes)`

#### For `env`

* Each injection **must** have:

  * `meta.targetName` (this becomes the environment variable name).
  * `strategy.key` **must be one of**: `'ssh-privatekey' | 'known_hosts'`.
* If `meta.targetName` is missing or empty → **throw** `"Missing targetName"`.
* If `key` is missing → **throw**
  `"[SshAuthSecretProvider] 'key' is required for env injection. Must be 'ssh-privatekey' or 'known_hosts'."`
* If `key` is not one of the allowed keys → **throw**
  `"[SshAuthSecretProvider] Invalid key '<key>'. Must be 'ssh-privatekey' or 'known_hosts'."`
* Return an array of `EnvVar` entries:

  ```ts
  {
    name: <meta.targetName>,
    valueFrom: {
      secretKeyRef: {
        name: this.config.name,
        key: strategy.key, // 'ssh-privatekey' or 'known_hosts'
      }
    }
  }
  ```

#### For `envFrom`

* Ensure **all injections are `envFrom`**; if not, **throw** with a helpful message.
* **Prefix rule:** If multiple injections specify prefixes, they must all be **identical**.

  * If different prefixes are present (including mixing `undefined` and a string), **throw** and include the detected set such as `"(none), SSH_"`.
* Return a **single** `EnvFromSource` item:

  ```ts
  [{
    ...(prefix && { prefix }),
    secretRef: { name: this.config.name }
  }]
  ```
* This mirrors the semantics in `BasicAuthSecretProvider`: multiple `envFrom` intents collapse to one `envFrom` entry.

---

## Error messages (consistency notes)

* Prefix main errors with `[SshAuthSecretProvider]` to match your style.
* Reuse the **same tone and structure** as `BasicAuthSecretProvider` for:

  * Unsupported strategy kind
  * Mixed strategies
  * Missing `targetName`
  * Missing or invalid `key`
  * Conflicting `envFrom` prefixes

---

## Test coverage (what to include)

Keep parity with `BasicAuthSecretProvider.test.ts`. The following cases should be present:

1. **prepare()**

   * Creates correct Secret object with type `kubernetes.io/ssh-auth`.
   * Base64 encodes both `ssh-privatekey` and `known_hosts` (when provided).
   * Defaults namespace to `default` if not specified.
   * Throws when `ssh-privatekey` is missing.
   * Throws when input is not an object.

2. **getInjectionPayload() — env**

   * Inject `ssh-privatekey` to `env` with `key: 'ssh-privatekey'`.
   * Inject `known_hosts` similarly.
   * Two separate `env` injections produce two `EnvVar` entries.
   * Missing `key` throws with the exact required-key message.
   * Invalid `key` (for example, `'username'`) throws with an “Invalid key” message.
   * Missing `targetName` throws.

3. **getInjectionPayload() — envFrom**

   * Produces one `envFrom` source without prefix.
   * Produces one `envFrom` source with prefix (for example, `SSH_`).
   * Mixing `env` and `envFrom` throws with message that includes both kinds and the “framework bug or incorrect targetPath” hint.
   * Multiple different prefixes throw and list all detected prefixes.
   * Accepts multiple `envFrom` with **same** prefix (no throw).
   * Accepts multiple `envFrom` with **no** prefix (no throw).

4. **getTargetPath()**

   * Returns `spec.template.spec.containers[0].env` for `env` default.
   * Honors `containerIndex`.
   * Returns `spec.template.spec.containers[0].envFrom` for `envFrom` default.
   * Honors custom `targetPath`.
   * Throws for unsupported kind.

5. **getEffectIdentifier()**

   * Returns `namespace/name`.
   * Uses `default` namespace if omitted.

6. **mergeSecrets()**

   * Merges multiple effects for the same Secret (for example, one effect with only `ssh-privatekey`, another with `known_hosts`).
   * Throws on duplicate key conflicts per existing merge handler semantics.

7. **metadata**

   * `secretType === 'Kubernetes.Secret.SshAuth'`
   * `targetKind === 'Deployment'`
   * `allowMerge === true`
   * `supportedStrategies` contains exactly `'env'` and `'envFrom'`

---

## Example shapes

**prepare() output (minimal)**

```ts
{
  type: 'kubectl',
  secretName: 'SSH_CRED',
  providerName: this.name,
  value: {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: config.name, namespace: config.namespace ?? 'default' },
    type: 'kubernetes.io/ssh-auth',
    data: {
      'ssh-privatekey': '<base64>',
      // optional:
      // known_hosts: '<base64>'
    }
  }
}
```

**env injection**

```ts
{
  name: 'SSH_PRIVATE_KEY',
  valueFrom: {
    secretKeyRef: { name: config.name, key: 'ssh-privatekey' }
  }
}
```

**envFrom injection (with prefix)**

```ts
{
  prefix: 'SSH_',
  secretRef: { name: config.name }
}
```

---

## Notes and edge cases

* Keep **error wording** parallel to `BasicAuthSecretProvider` for a uniform developer experience.
* Ensure the **homogeneity rule** is enforced **before** any branch-specific logic (same as your current implementation).
* When only `ssh-privatekey` is provided (typical case), provider still supports `envFrom` and `env` consistently.
