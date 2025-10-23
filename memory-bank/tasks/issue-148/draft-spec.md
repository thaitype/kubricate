# Feature: Add ServiceAccountTokenSecretProvider for kubernetes.io/service-account-token


## Purpose

Provide a type-safe Secret provider that creates and injects **Service Account Token** Secrets:

* **Secret `type`**: `kubernetes.io/service-account-token`
* **Controller-populated keys** (post-creation):

  * `token` — JWT bound to the ServiceAccount
  * `ca.crt` — cluster CA certificate (PEM)
  * `namespace` — namespace of the ServiceAccount

> Note: For this Secret type, **data is populated by Kubernetes** after creation when the annotation is set. The provider must not attempt to base64-encode or set `data` on its own.

---

## Public API

### Config

```ts
export interface ServiceAccountTokenSecretProviderConfig {
  /** Name of the Kubernetes Secret to create/use */
  name: string;

  /** Namespace for the Secret (default: 'default') */
  namespace?: string;

  /**
   * Optional: Set automount on target Pod/containers separately in workload specs.
   * (Provider does not toggle Pod spec automount; included here for future extension.)
   */
  // automountServiceAccountToken?: boolean; // (not used at provider level)
}
```

### Value Schema (for `prepare()`)

```ts
// The only required input is which ServiceAccount the token should bind to.
export const serviceAccountTokenSecretSchema = z.object({
  /** The ServiceAccount name to bind the token to (must exist in same namespace) */
  serviceAccountName: z.string().min(1),

  /**
   * Optional additional annotations to attach to the Secret.
   * NOTE: The provider will always set/override
   * 'kubernetes.io/service-account.name' to 'serviceAccountName'.
   */
  annotations: z.record(z.string()).optional(),
});
```

> Rationale: Unlike basic/opaque secrets, the token secret **must** include `metadata.annotations["kubernetes.io/service-account.name"]` so that the controller populates `data`. We keep `value` minimal and validated.

### Supported Strategies

* `'env'` — inject a **single** key as an environment variable
* `'envFrom'` — inject **all** keys from the Secret (with optional prefix)

```ts
type SupportedStrategies = 'env' | 'envFrom';
```

### Allowed Keys for `'env'` strategy

```ts
type ServiceAccountTokenKnownKey = 'token' | 'ca.crt' | 'namespace';
```

---

## Behavior

### 1) `prepare(name: string, value: SecretValue): PreparedEffect[]`

* Validate `value` against `serviceAccountTokenSecretSchema`.
* Emit **one** `kubectl` effect:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: <config.name>
  namespace: <config.namespace ?? 'default'>
  annotations:
    kubernetes.io/service-account.name: <value.serviceAccountName>
    # merge any value.annotations (provider wins on the SA name key)
type: kubernetes.io/service-account-token
# data: omitted intentionally (controller fills token/ca.crt/namespace)
```

* `secretName` on the effect equals the logical name passed to `prepare()` (e.g., `"SERVICE_ACCOUNT_TOKEN"`).
* `providerName` is the class instance `name`.

### 2) `getTargetPath(strategy: SecretInjectionStrategy): string`

* Same shape and defaults as `BasicAuthSecretProvider`:

  * `'env'`: `spec.template.spec.containers[<containerIndex|0>].env`
  * `'envFrom'`: `spec.template.spec.containers[<containerIndex|0>].envFrom`
  * Respect `strategy.targetPath` override
  * Throw on unsupported strategy

### 3) `getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] | EnvFromSource[]`

* **Homogeneity rule**: all injections must use the **same** strategy kind; throw informative error if mixed.
* For `'env'`:

  * Require `meta.targetName` (env var name).
  * Require `strategy.key` ∈ `{'token','ca.crt','namespace'}`; throw on invalid/missing key.
  * Return standard `EnvVar[]` with `valueFrom.secretKeyRef` pointing to `config.name` and the chosen key.
* For `'envFrom'`:

  * Validate all are `'envFrom'`.
  * Validate **single** common prefix across all injections:

    * All null/undefined prefixes → OK
    * All same non-empty prefix → OK
    * Mixture or >1 distinct prefixes → throw with enumerated list (e.g., `DB_, API_, (none)`).
  * Return **one** `EnvFromSource` item with `secretRef.name = config.name` and the (optional) `prefix`.

> The method should also include the same helpful context in mixed-strategy error messages as seen in `BasicAuthSecretProvider` (mention kinds, and hint at framework bug or wrong `targetPath`).

### 4) `getEffectIdentifier(effect: PreparedEffect): string`

* Return `"<namespace>/<name>"`, defaulting namespace to `"default"` if absent.

### 5) `mergeSecrets(effects: PreparedEffect[]): PreparedEffect[]`

* Use existing `createKubernetesMergeHandler()` to dedupe by `namespace/name`.
* Because this Secret has no `.data` authored by us, merges are effectively **no-op** but still deduplicate identical objects.
* `allowMerge = true` to keep parity with other providers and enable deduplication.

### 6) Metadata

```ts
readonly secretType = 'Kubernetes.Secret.ServiceAccountToken';
readonly targetKind = 'Deployment';
readonly supportedStrategies: SupportedStrategies[] = ['env', 'envFrom'];
readonly allowMerge = true;
```

---

## Validation & Error Messages (must)

* Mixed strategies in one `getInjectionPayload()` call →
  `"[ServiceAccountTokenSecretProvider] Mixed injection strategies are not allowed. Expected all injections to use '<kind>' but found: env, envFrom. This is likely a framework bug or incorrect targetPath configuration."`
* `'env'` without `targetName` →
  `"[ServiceAccountTokenSecretProvider] Missing targetName (.forName) for env injection."`
* `'env'` without `key` or `key` not in allowed set →
  `"[ServiceAccountTokenSecretProvider] 'key' is required for env injection. Must be 'token', 'ca.crt', or 'namespace'."`
  or
  `"[ServiceAccountTokenSecretProvider] Invalid key '<key>'. Must be 'token', 'ca.crt', or 'namespace'."`
* `'envFrom'` conflicting prefixes →
  `"[ServiceAccountTokenSecretProvider] Multiple envFrom prefixes detected: API_, DB_, (none). All envFrom injections for the same secret must use the same prefix."`
* Unsupported strategy anywhere →
  `"[ServiceAccountTokenSecretProvider] Unsupported injection strategy: <kind>"` (or “Unsupported strategy kind” in router)

---

## Test Plan (Vitest) — Parity with `BasicAuthSecretProvider`

### `prepare()`

1. **Generates correct Secret skeleton**

   * Asserts `type: 'kubernetes.io/service-account-token'`
   * Asserts `metadata.annotations['kubernetes.io/service-account.name']` set
   * Asserts no `data` property authored
2. **Uses default namespace**
3. **Merges additional annotations but overrides SA name**
4. **Returns one `kubectl` effect with `secretName`, `providerName`**

### `getInjectionPayload() — env`

5. Inject `token` → yields `EnvVar` with `secretKeyRef.key = 'token'`
6. Inject `ca.crt` and `namespace` similarly
7. Missing `key` → throws required-key error
8. Invalid `key` (e.g., `'aud'`) → throws invalid-key error
9. Missing `targetName` → throws missing targetName

### `getInjectionPayload() — envFrom`

10. Single envFrom without prefix → `[{ secretRef: { name: <config.name> } }]`
11. Single envFrom with prefix → `[{ prefix: 'SA_', secretRef: { name: <config.name> } }]`
12. Multiple envFrom with **same** prefix → OK (still returns a single entry)
13. Multiple envFrom **no** prefix → OK
14. Mixed prefixes (e.g., `'API_'` and `'DB_'`) → throws with both prefixes listed
15. Mixed prefixed & non-prefixed → throws with `'(none)'` included

### Mixed Strategy Validation

16. Provide one `'env'` and one `'envFrom'` in a call → throws with kind list and helpful hint
17. Same but both pointing to same `path` (to trigger the “framework bug or incorrect targetPath” wording) → message includes hint

### `getTargetPath()`

18. `'env'` default index 0 → `spec.template.spec.containers[0].env`
19. `'env'` custom index 2 → correct path
20. `'envFrom'` default/custom index → correct paths
21. Custom `targetPath` → returned verbatim
22. Unsupported strategy → throws

### `getEffectIdentifier()`

23. Returns `namespace/name`; defaults to `'default'` if missing

### `mergeSecrets()`

24. Two identical ServiceAccountToken Secret effects for same `ns/name` → merged into one (no data merge conflicts)
25. Different namespaces → both preserved

### `supportedStrategies` & metadata

26. Contains both `'env'` and `'envFrom'`, length 2
27. `secretType`, `targetKind`, `allowMerge` assertions

---

## Implementation Notes

* **No Base64** handling in `prepare()`; controller fills `data`.
* **Robust parsing** via `parseZodSchema` (use provided helper).
* **Error messages** mirror tone/clarity of `BasicAuthSecretProvider`.
* **Index export**: add provider to `index.ts`.
* **Docs**: JSDoc links to K8s docs for service account token secrets.

---

## Example Usage

```ts
const provider = new ServiceAccountTokenSecretProvider({
  name: 'my-sa-token',
  namespace: 'production',
});

// 1) Create the Secret (controller will populate token/ca/namespace)
const effects = provider.prepare('SERVICE_ACCOUNT_TOKEN', {
  serviceAccountName: 'api-runner',
  annotations: {
    // optional non-conflicting annotations
    'app.kubernetes.io/managed-by': 'kubricate',
  },
});

// 2) Inject only the token as ENV
const envPayload = provider.getInjectionPayload([
  {
    providerId: 'serviceAccountToken',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].env',
    meta: {
      secretName: 'SERVICE_ACCOUNT_TOKEN',
      targetName: 'SERVICE_ACCOUNT_JWT',
      strategy: { kind: 'env', key: 'token' },
    },
  },
]);

// 3) Or inject all keys with prefix
const envFromPayload = provider.getInjectionPayload([
  {
    providerId: 'serviceAccountToken',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].envFrom',
    meta: {
      secretName: 'SERVICE_ACCOUNT_TOKEN',
      targetName: 'SERVICE_ACCOUNT_TOKEN',
      strategy: { kind: 'envFrom', prefix: 'SA_' },
    },
  },
]);
```
