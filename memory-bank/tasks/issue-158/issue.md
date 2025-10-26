# Feature Request: Add CustomTypeSecretProvider for user-defined Kubernetes Secret types

## 🧠 Summary

Introduce **`CustomTypeSecretProvider`**, a flexible provider for creating and injecting Kubernetes Secrets with **user-defined types** (non-Opaque, non-fixed key).
This provider acts as a lightweight, extensible solution for teams that need to define custom secret types (e.g., `vendor.com/custom`, `my.company/api-token`) without writing a full bespoke provider.

## 🎯 Goal / Motivation

Currently, Kubricate supports only fixed-type or Opaque secret providers:

* `OpaqueSecretProvider` — fully unstructured KV pairs
* `BasicAuthSecretProvider`, `TlsSecretProvider`, etc. — fixed key sets with known semantics

However, teams occasionally need to create **non-Opaque custom Secret types** with **flexible key/value pairs**, such as integrating with third-party systems or internal conventions (e.g., `type: vendor.com/custom`).

This provider fills the gap between “fully generic” and “fully specialized,” enabling users to:

* Define their own `Secret.type`
* Use dynamic keys safely with validation or guardrails
* Avoid duplicating boilerplate provider code

## 📦 Scope

**In Scope**

* New provider: `CustomTypeSecretProvider`
* Support for arbitrary Kubernetes Secret `type` (non-Opaque)
* Accept key/value map as input (`Record<string, string>`)
* Automatic base64 encoding
* Support `env` and `envFrom` injection strategies
* Prefix and mixed-strategy validation (reuse core logic)
* Optional:

  * `allowedKeys?: readonly string[]`
  * `keyPolicy?: { pattern?: RegExp; maxLen?: number; forbid?: RegExp }`

**Out of Scope**

* Schema-driven transforms (Zod validation / `toData()` mapping)
* File I/O (`fromFile`) resolution
* Additional strategies (e.g., `imagePullSecret`, `projection`)

## 🧭 High-Level Design

### Design Overview

The `CustomTypeSecretProvider` acts as a generic, reusable provider class for **non-Opaque, non-fixed secret types**.

It extends the standard provider contract:

* **prepare()** — builds a Secret manifest of custom type
* **getInjectionPayload()** — supports both `env` and `envFrom` with consistency checks
* **mergeSecrets()** — deduplicates Secrets via `namespace/name` merge handler

Validation rules mirror existing providers:

* Homogeneous strategy enforcement
* EnvFrom prefix consistency check
* Duplicate key conflict detection

This MVP excludes advanced schema-driven mapping for simplicity and focuses on unblocking flexible secret authoring.

### Configuration Example

```ts
import { CustomTypeSecretProvider } from '@kubricate/plugin-kubernetes';

// Example: non-Opaque custom secret type
const provider = new CustomTypeSecretProvider({
  name: 'api-token-secret',
  namespace: 'production',
  secretType: 'vendor.com/custom',
  allowedKeys: ['api_key', 'endpoint'], // optional
  keyPolicy: { pattern: /^[A-Z0-9_]+$/i, maxLen: 63 },
});

// Create the Secret
const effects = provider.prepare('API_TOKEN', {
  api_key: 'abcd-1234',
  endpoint: 'https://vendor.example.com',
});

// Inject via env
const envPayload = provider.getInjectionPayload([
  {
    providerId: 'customType',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].env',
    meta: {
      secretName: 'API_TOKEN',
      targetName: 'VENDOR_API_KEY',
      strategy: { kind: 'env', key: 'api_key' },
    },
  },
]);
```

## ⚙️ API Design

* **Config**

  * `name: string` — Secret name
  * `namespace?: string` — defaults to `'default'`
  * `secretType: string` — required; must not be `'Opaque'`
  * `allowedKeys?: readonly string[]` — optional; limits valid env keys (gives typed DX)
  * `keyPolicy?: { pattern?: RegExp; maxLen?: number; forbid?: RegExp }` — optional guardrails for dynamic keys

* **Methods**

  * `prepare(name: string, value: Record<string, string>): PreparedEffect[]`
    → builds Secret manifest with `data` base64-encoded
  * `getInjectionPayload(injectes: ProviderInjection[])`
    → supports `env` and `envFrom`
  * `mergeSecrets(effects: PreparedEffect[])`
    → deduplication via `createKubernetesMergeHandler()`

## 🧱 Implementation Notes

* Reuse existing utility modules:

  * `createKubernetesMergeHandler()`
  * `parseZodSchema()` (if extended in v2 for schema-driven mode)
* Error messages should mirror tone of existing providers:

  * Mixed strategy validation
  * Missing targetName
  * Invalid key per policy or allowedKeys
  * Prefix conflicts
* `secretType` must explicitly differ from `'Opaque'` to prevent confusion
* Internal extensibility:

  * Future versions can accept `valueSchema` + `toData()` to support schema-driven transformations

## ✅ Checklist

* [x] I have checked existing issues and PRs
* [x] I have considered alternatives (e.g., Opaque, dedicated providers)
* [x] I have included a proposed design
* [x] This feature aligns with the project’s design principles (type-safe, minimal, extensible)
* [x] I’m open to feedback and iteration
