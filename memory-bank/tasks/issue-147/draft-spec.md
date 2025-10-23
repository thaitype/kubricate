
# TlsSecretProvider — Requirements (kubernetes.io/tls)

## Purpose

Provide a type-safe provider that:

* Generates a Kubernetes Secret of type `kubernetes.io/tls`
* Encodes `tls.crt` and `tls.key` (PEM strings) to base64
* Supports safe, typed injection into `Deployment` manifests via:

  * `env` (inject a single key: `tls.crt` or `tls.key`)
  * `envFrom` (inject both keys at once, optional `prefix`)
* Enforces strategy homogeneity and prefix consistency (matching `BasicAuthSecretProvider` behavior)
* Supports effect merging across emits with duplicate `(namespace, name)` (same merge semantics)

> Note: While TLS material is commonly mounted as a volume, this first provider version intentionally mirrors your existing primitives (`env`, `envFrom`) to reduce surface area and reuse validation/merge logic. (A follow-up `VolumeSecretProvider` can add mounts if/when needed.)

---

## Public API

### Config

```ts
export interface TlsSecretProviderConfig {
  /** Kubernetes Secret name */
  name: string;
  /** Namespace (default: "default") */
  namespace?: string;
}
```

### Supported Strategies

```ts
type SupportedStrategies = 'env' | 'envFrom';
```

### Secret Value Schema (Zod)

```ts
export const tlsSecretSchema = z.object({
  /** PEM-encoded certificate (-----BEGIN CERTIFICATE----- ... ) */
  cert: z.string().min(1),
  /** PEM-encoded private key (-----BEGIN PRIVATE KEY----- ... ) */
  key: z.string().min(1),
});
```

* On `prepare()`, map to Kubernetes TLS keys:

  * `data["tls.crt"] = base64(cert)`
  * `data["tls.key"] = base64(key)`

### Class Skeleton

```ts
export class TlsSecretProvider
  implements BaseProvider<TlsSecretProviderConfig, SupportedStrategies> {
  readonly allowMerge = true;
  readonly secretType = 'Kubernetes.Secret.Tls';
  readonly targetKind = 'Deployment';
  readonly supportedStrategies: SupportedStrategies[] = ['env', 'envFrom'];

  constructor(public config: TlsSecretProviderConfig) {}

  getTargetPath(strategy: SecretInjectionStrategy): string; // same behavior as BasicAuth
  getEffectIdentifier(effect: PreparedEffect): string;      // "<ns>/<name>"
  getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] | EnvFromSource[];
  mergeSecrets(effects: PreparedEffect[]): PreparedEffect[]; // reuse createKubernetesMergeHandler
  prepare(name: string, value: SecretValue): PreparedEffect[]; // see below
}
```

---

## Behavior Details

### `prepare(name, value)`

* Validate `value` with `tlsSecretSchema`
* Base64-encode:

  * `tls.crt` ← `cert`
  * `tls.key` ← `key`
* Emit a single `kubectl` effect:

```ts
{
  secretName: name,
  providerName: this.name,
  type: 'kubectl',
  value: {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: this.config.name,
      namespace: this.config.namespace ?? 'default',
    },
    type: 'kubernetes.io/tls',
    data: {
      'tls.crt': Base64.encode(cert),
      'tls.key': Base64.encode(key),
    },
  },
}
```

### `getTargetPath(strategy)`

* Mirror `BasicAuthSecretProvider`:

  * `env`: `spec.template.spec.containers[<index>].env`
  * `envFrom`: `spec.template.spec.containers[<index>].envFrom`
  * Respect `strategy.targetPath` override
  * Throw on unsupported kinds

### `getInjectionPayload(injectes)`

* **Homogeneity**: All injections must use the same `kind` (env *or* envFrom). Throw on mix.
* **env strategy**

  * Require `.meta.targetName` (the env var name)
  * Require `.meta.strategy.key` ∈ `{'tls.crt', 'tls.key'}`
  * Return:

    ```ts
    [{
      name: targetName,
      valueFrom: {
        secretKeyRef: { name: config.name, key /* 'tls.crt' | 'tls.key' */ }
      }
    }]
    ```
* **envFrom strategy**

  * Ensure every injection is `envFrom`
  * Validate all `prefix` values are the same (including `undefined`)
  * Return single `EnvFromSource` (deduped):

    ```ts
    [{
      ...(prefix && { prefix }),
      secretRef: { name: config.name }
    }]
    ```
* **Helpful errors** (copy tone from BasicAuth):

  * Mixed strategies: list found kinds and hint about targetPath misconfig
  * `env` without key
  * `env` with invalid key
  * Missing `targetName` for `env`

### `mergeSecrets(effects)`

* Reuse `createKubernetesMergeHandler()` exactly as others do
* For multiple effects to the same `(ns, name)`, merge `.data`
* Throw on duplicate keys (same error shape as existing merge util)

### `getEffectIdentifier(effect)`

* Return `"<namespace>/<name>"`, default namespace to `"default"`

---

## Tests (Vitest) — Parity with `BasicAuthSecretProvider`

Create `TlsSecretProvider.test.ts` with the following suites:

### 1) `prepare()`

* **generates correct TLS Secret**

  * type `kubernetes.io/tls`
  * keys `tls.crt`, `tls.key` present (any string)
* **base64 encodes cert & key**

  * use small dummy PEM strings, assert exact base64
* **defaults namespace to "default"**
* **throws if cert is missing**
* **throws if key is missing**
* **throws if value is not an object**

### 2) `getInjectionPayload() - env strategy`

* **inject `tls.crt`**

  * meta.strategy.key = `'tls.crt'`, targetName e.g. `TLS_CERT`
* **inject `tls.key`**

  * meta.strategy.key = `'tls.key'`, targetName e.g. `TLS_KEY`
* **inject both as separate env vars**

  * two injections; assert both entries with proper keys
* **throws if key is missing in env strategy**

  * meta.strategy without `key`
* **throws if key not `'tls.crt' | 'tls.key'`**
* **throws if targetName missing/empty**

### 3) `getInjectionPayload() - envFrom strategy`

* **inject entire secret without prefix**

  * one `EnvFromSource` with `secretRef.name = config.name`
* **inject entire secret with prefix**

  * `prefix: 'TLS_'` respected
* **prefix validation**

  * multiple different prefixes → throw & list prefixes
  * mixing prefixed and non-prefixed → throw & include `(none)`
  * same prefix across many → ok
  * all undefined prefix → ok

### 4) `getTargetPath()`

* **env default index 0** → `spec.template.spec.containers[0].env`
* **env custom index** → index reflected
* **envFrom default/custom index** → as above
* **custom targetPath respected**
* **unsupported strategy throws** (e.g., `{kind: 'annotation'} as any`)

### 5) `getEffectIdentifier()`

* **returns "namespace/name"**
* **defaults namespace to "default" when missing**

### 6) `mergeSecrets()`

* **merges multiple effects for same secret** (e.g., one adds only `tls.crt`, another adds only `tls.key`)
* **throws on duplicate keys** (two effects both define `tls.crt` with different values)

### 7) `supportedStrategies` & metadata

* `supportedStrategies` contains `env`, `envFrom` (length 2)
* `secretType === 'Kubernetes.Secret.Tls'`
* `targetKind === 'Deployment'`
* `allowMerge === true`

---

## Example Usage

### a) Create TLS secret from PEM strings

```ts
const provider = new TlsSecretProvider({ name: 'ingress-tls', namespace: 'prod' });

const effects = provider.prepare('INGRESS_TLS', {
  cert: readFileSync('./certs/fullchain.pem', 'utf8'),
  key:  readFileSync('./certs/privkey.pem', 'utf8'),
});
```

### b) Inject as env (discouraged for prod, but supported)

```ts
const injections = [
  {
    providerId: 'tls',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].env',
    meta: {
      secretName: 'TLS_CERT',
      targetName: 'TLS_CERT',
      strategy: { kind: 'env', key: 'tls.crt' },
    },
  },
  {
    providerId: 'tls',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].env',
    meta: {
      secretName: 'TLS_KEY',
      targetName: 'TLS_KEY',
      strategy: { kind: 'env', key: 'tls.key' },
    },
  },
];

const payload = provider.getInjectionPayload(injections);
// -> EnvVar[] with secretKeyRef keys 'tls.crt' and 'tls.key'
```

### c) Inject all keys with `envFrom` (optional prefix)

```ts
const injections = [
  {
    providerId: 'tls',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].envFrom',
    meta: {
      secretName: 'INGRESS_TLS',
      targetName: 'INGRESS_TLS',
      strategy: { kind: 'envFrom', prefix: 'TLS_' },
    },
  },
];

const payload = provider.getInjectionPayload(injections);
// -> [{ prefix: 'TLS_', secretRef: { name: 'ingress-tls' } }]
```

---

## Implementation Notes

* Copy `BasicAuthSecretProvider` as a template; replace:

  * schema → `tlsSecretSchema` (`cert`, `key`)
  * keys validation for env → allow only `'tls.crt' | 'tls.key'`
  * secret type → `'kubernetes.io/tls'`
  * provider metadata → `Kubernetes.Secret.Tls`
  * base64 inputs accordingly
* Keep the exact validation/error messaging style for consistent DX.
* Reuse `parseZodSchema`, `createKubernetesMergeHandler`, and `EnvVar`/`EnvFromSource` shapes as in BasicAuth.

---

## Out-of-Scope (Future)

* Volume/volumeMount injection helpers for TLS material (preferred operational pattern)
* Optional `ca.crt` support (not part of `kubernetes.io/tls` spec, but commonly added to `Opaque` or custom types)
