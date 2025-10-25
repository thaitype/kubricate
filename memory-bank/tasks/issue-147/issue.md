# 💡 Feature Request / Enhancement Proposal

> Issue #147: Implement TlsSecretProvider for TLS certificate management

## 🧠 Summary

Implement `TlsSecretProvider` to generate and manage Kubernetes Secrets of type `kubernetes.io/tls` for TLS certificates and private keys with type-safe secret injection.

## 🎯 Goal / Motivation

Currently, Kubricate supports basic-auth, SSH keys, and Docker registry credentials through specialized providers, but lacks native support for TLS certificate management. This feature enables:
- Type-safe TLS certificate and key management
- Consistent secret injection patterns (env/envFrom strategies)
- Automatic base64 encoding of PEM-encoded certificates
- Integration with existing Kubricate stack patterns

## 📦 Scope

**In Scope**
- Generate `kubernetes.io/tls` type Kubernetes Secrets
- Accept PEM-encoded certificate (`cert`) and private key (`key`) as input
- Support `env` strategy for individual key injection (`tls.crt` or `tls.key`)
- Support `envFrom` strategy for bulk injection with optional prefix
- Input validation using Zod schema
- Effect merging for same namespace/name combination
- Comprehensive test coverage matching `BasicAuthSecretProvider` parity
- Export from `@kubricate/plugin-kubernetes`

**Out of Scope**
- Volume-based certificate mounting (future enhancement)
- Certificate Authority (`ca.crt`) support (not required by kubernetes.io/tls type)
- PEM format validation (Kubernetes accepts any base64 data)
- Certificate rotation or renewal logic
- Integration with cert-manager or ACME providers

## 🧭 High-Level Design

### Design Overview

`TlsSecretProvider` follows the established provider pattern from `BasicAuthSecretProvider`:
- Implements `BaseProvider<TlsSecretProviderConfig, SupportedStrategies, SupportedEnvKeys>`
- Uses Zod schema (`tlsSecretSchema`) for runtime validation
- Supports strategy homogeneity enforcement (all injections use same strategy)
- Reuses `createKubernetesMergeHandler()` for effect deduplication
- Provides clear error messages matching existing provider style

### Configuration Example

```ts
import { TlsSecretProvider } from '@kubricate/plugin-kubernetes';

const tlsProvider = new TlsSecretProvider({
  name: 'ingress-tls',
  namespace: 'production', // optional, defaults to 'default'
});

// Input: PEM-encoded certificate and key
const secretValue = {
  cert: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
  key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
};

// env strategy: inject specific keys
stack.useSecrets(secretManager, injector => {
  injector.inject('INGRESS_TLS', {
    provider: tlsProvider,
    strategy: { kind: 'env', key: 'tls.crt' },
  }).forName('TLS_CERT');

  injector.inject('INGRESS_TLS', {
    provider: tlsProvider,
    strategy: { kind: 'env', key: 'tls.key' },
  }).forName('TLS_KEY');
});

// envFrom strategy: inject all keys with prefix
stack.useSecrets(secretManager, injector => {
  injector.inject('INGRESS_TLS', {
    provider: tlsProvider,
    strategy: { kind: 'envFrom', prefix: 'TLS_' },
  });
});
```

---

## ⚙️ API Design

**TlsSecretProviderConfig**
```ts
interface TlsSecretProviderConfig {
  name: string;           // Name of the Kubernetes Secret
  namespace?: string;     // Namespace (default: 'default')
}
```

**Input Schema**
```ts
const tlsSecretSchema = z.object({
  cert: z.string(),  // PEM-encoded certificate
  key: z.string(),   // PEM-encoded private key
});
```

**Public Methods**
- `prepare(name: string, value: SecretValue): PreparedEffect[]` - Generate kubernetes.io/tls Secret
- `getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] | EnvFromSource[]` - Generate injection payload
- `getTargetPath(strategy: SecretInjectionStrategy): string` - Resolve target path in manifest
- `getEffectIdentifier(effect: PreparedEffect): string` - Generate unique identifier for deduplication
- `mergeSecrets(effects: PreparedEffect[]): PreparedEffect[]` - Merge multiple effects

**Properties**
- `secretType = 'Kubernetes.Secret.Tls'`
- `targetKind = 'Deployment'`
- `allowMerge = true`
- `supportedStrategies: ['env', 'envFrom']`
- `supportedEnvKeys: ['tls.crt', 'tls.key']`

---

## 🧱 Implementation Notes

**Technical Considerations:**
1. Use `Base64.encode()` from `js-base64` for consistent encoding
2. Follow exact error message patterns from `BasicAuthSecretProvider`
3. Reuse `parseZodSchema()` utility for input validation
4. Implement private `extractStrategy()` for path-based inference
5. Implement private `getEnvInjectionPayload()` and `getEnvFromInjectionPayload()` for strategy routing
6. Validate strategy homogeneity (throw on mixed env/envFrom)
7. Validate prefix consistency for envFrom (throw on conflicting prefixes)

**File Location:**
`packages/plugin-kubernetes/src/TlsSecretProvider.ts`

**Dependencies:**
- `@kubricate/core` (BaseProvider interface)
- `js-base64` (Base64 encoding)
- `zod` (schema validation)
- `./merge-utils.js` (effect merging)
- `./utils.js` (parseZodSchema)
- `./kubernetes-types.js` (EnvVar, EnvFromSource types)

**Test Coverage Target:**
Achieve parity with `BasicAuthSecretProvider.test.ts`:
- 100% function coverage
- 98%+ statement coverage
- All edge cases and error paths tested
- ~40+ test cases across 7 test suites

## ✅ Checklist

* [x] I have checked existing issues and PRs
* [x] I have considered alternatives (volume mounting - deferred to future)
* [x] I have included a proposed design
* [x] This feature aligns with the project's design principles (follows existing provider patterns)
* [x] I'm open to feedback and iteration
