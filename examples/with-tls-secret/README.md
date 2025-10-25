# Example: With TLS Secret

This example demonstrates how to use **TlsSecretProvider** to manage `kubernetes.io/tls` secrets for TLS certificates and private keys in your Kubernetes deployments.

## 📖 Overview

This example shows three different patterns for using TlsSecretProvider:

1. **Individual key injection** - Inject `tls.crt` and `tls.key` as separate environment variables
2. **Bulk injection with prefix** - Use `envFrom` to inject both certificate and key with a prefix
3. **Bulk injection without prefix** - Use `envFrom` to inject TLS material directly

> **Note**: While TLS certificates are typically mounted as volumes in production environments, this example demonstrates environment variable injection for scenarios where that's required or preferred.

## 🏗️ What's Included

### Stacks

- **namespace** - Default namespace
- **ingressControllerApp** - Ingress controller using individual env injection (`env` with `key`)
- **apiGatewayApp** - API gateway using bulk injection with prefix (`envFrom` with `prefix`)
- **sidecarProxyApp** - Sidecar proxy using bulk injection without prefix (`envFrom`)

### Features Demonstrated

- ✅ `kubernetes.io/tls` Secret type generation
- ✅ Individual key selection with `inject('env', { key: 'tls.crt' })`
- ✅ Bulk injection with `inject('envFrom', { prefix: 'TLS_' })`
- ✅ Type-safe TLS certificate management
- ✅ Multiple deployment patterns in one example

## 🚀 Quick Start

### 1. Setup Environment Variables

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit `.env` to set your TLS certificates:

```bash
# Ingress TLS Certificate
KUBRICATE_SECRET_INGRESS_TLS={"cert":"-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----","key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"}

# API TLS Certificate
KUBRICATE_SECRET_API_TLS={"cert":"-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----","key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"}
```

### 2. Generate Kubernetes Manifests

Run the following command to generate resources:

```bash
pnpm --filter=@examples/with-tls-secret kubricate generate
```

Or from the example directory:

```bash
pnpm kbr generate
```

### 3. Review Generated Resources

Check the `output/` directory for generated YAML files:

```bash
ls -la output/
```

You should see:
- `namespace.yml` - Namespace definition
- `ingressControllerApp.yml` - Ingress controller with individual env vars
- `apiGatewayApp.yml` - API gateway with prefixed env vars
- `sidecarProxyApp.yml` - Sidecar proxy with direct env vars

## 📋 Generated Resources Explained

### Ingress Controller (Individual Key Injection)

The ingress controller uses **individual key injection** to set specific environment variable names:

```typescript
c.secrets('INGRESS_TLS')
  .forName('TLS_CERT')
  .inject('env', { key: 'tls.crt' });

c.secrets('INGRESS_TLS')
  .forName('TLS_KEY')
  .inject('env', { key: 'tls.key' });
```

**Generated YAML**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ingress-tls
  namespace: kubricate-with-tls-secret
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-certificate>
  tls.key: <base64-encoded-private-key>
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: ingress-controller
        env:
        - name: TLS_CERT
          valueFrom:
            secretKeyRef:
              name: ingress-tls
              key: tls.crt
        - name: TLS_KEY
          valueFrom:
            secretKeyRef:
              name: ingress-tls
              key: tls.key
```

### API Gateway (Bulk Injection with Prefix)

The API gateway uses **envFrom with prefix** for bulk injection:

```typescript
c.secrets('API_TLS').inject('envFrom', { prefix: 'TLS_' });
```

**Generated YAML**:
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: api-gateway
        envFrom:
        - prefix: TLS_
          secretRef:
            name: api-tls
```

**Resulting Environment Variables**:
- `TLS_tls.crt=<certificate-value>`
- `TLS_tls.key=<key-value>`

### Sidecar Proxy (Bulk Injection without Prefix)

The sidecar proxy uses **envFrom without prefix**:

```typescript
c.secrets('INGRESS_TLS').inject('envFrom');
```

**Resulting Environment Variables**:
- `tls.crt=<certificate-value>`
- `tls.key=<key-value>`

## 🔐 Secret Management

### Format

TlsSecretProvider expects secrets in JSON format with `cert` and `key` fields containing PEM-encoded data:

```json
{
  "cert": "-----BEGIN CERTIFICATE-----\\nMIID...\\n-----END CERTIFICATE-----",
  "key": "-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----"
}
```

**Important Notes**:
- Certificates and keys must be in PEM format
- Newlines in PEM data must be escaped as `\\n` in JSON
- The provider will automatically base64-encode the values for Kubernetes

### Loading Secrets

In this example, secrets are loaded from `.env` file using `EnvConnector`:

```typescript
export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  // Provider for ingress TLS certificate
  .addProvider('IngressTlsProvider', new TlsSecretProvider({
    name: 'ingress-tls',
    namespace: 'default',
  }))
  // Provider for API service mTLS certificate
  .addProvider('ApiTlsProvider', new TlsSecretProvider({
    name: 'api-tls',
    namespace: 'default',
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('IngressTlsProvider')
  .addSecret({
    name: 'INGRESS_TLS',
    provider: 'IngressTlsProvider',
  })
  .addSecret({
    name: 'API_TLS',
    provider: 'ApiTlsProvider',
  });
```

### Why Separate Providers?

**Important**: Each `TlsSecretProvider` instance manages a **single Kubernetes Secret resource**. When you need to create multiple TLS secrets with different certificates, you must use separate provider instances.

**❌ Incorrect - Using one provider for multiple secrets**:
```typescript
// This will cause a conflict!
.addProvider('TlsSecretProvider', new TlsSecretProvider({
  name: 'ingress-tls',  // Single Secret resource
}))
.addSecret({ name: 'INGRESS_TLS' })  // cert + key
.addSecret({ name: 'API_TLS' })       // cert + key (CONFLICT!)
```

**Error**: `[conflict:k8s] Conflict detected: key "tls.crt" already exists in Secret "ingress-tls"`

**Why it fails**: Both secrets try to write `tls.crt` and `tls.key` keys into the same Secret resource (`ingress-tls`), causing a key collision.

**✅ Correct - Separate provider for each secret**:
```typescript
// Each provider creates its own Secret resource
.addProvider('IngressTlsProvider', new TlsSecretProvider({
  name: 'ingress-tls',     // Secret 1
}))
.addProvider('ApiTlsProvider', new TlsSecretProvider({
  name: 'api-tls',          // Secret 2
}))
.addSecret({ name: 'INGRESS_TLS', provider: 'IngressTlsProvider' })
.addSecret({ name: 'API_TLS', provider: 'ApiTlsProvider' })
```

**Result**: Two separate Kubernetes Secrets are created:
- `ingress-tls` with ingress certificate/key
- `api-tls` with API certificate/key

**Key Takeaway**: Unlike `OpaqueSecretProvider` which can merge multiple secrets into one resource, `TlsSecretProvider` has a **fixed schema** (`tls.crt` + `tls.key`), so you need one provider instance per certificate.

### Validation

TlsSecretProvider validates that secrets contain both `cert` and `key` fields. Invalid secrets will fail at build time with clear error messages.

## 🎯 Use Cases

This pattern is useful for:

- 🔒 **Ingress TLS Termination** - HTTPS certificates for ingress controllers
- 🔐 **mTLS Authentication** - Mutual TLS between services
- 🌐 **API Gateway TLS** - Secure API gateway communication
- 📡 **Service Mesh** - Certificate management for service mesh sidecars
- 🛡️ **Webhook TLS** - Kubernetes admission webhook certificates

## 📚 Key Concepts

### Individual Key Injection (`env`)

When you need **granular control** over environment variable names:

```typescript
.inject('env', { key: 'tls.crt' })  // Select specific key
.forName('CUSTOM_ENV_NAME')          // Set custom env var name
```

**Required**:
- ✅ Must use `.forName()` to specify environment variable name
- ✅ Must provide `key` parameter ('tls.crt' or 'tls.key')

### Bulk Injection (`envFrom`)

When you want to **inject all TLS material** at once:

```typescript
.inject('envFrom')                    // No prefix
.inject('envFrom', { prefix: 'TLS_' }) // With prefix
```

**Optional**:
- 🔧 `prefix` adds a prefix to all environment variables

## 🧪 Testing the Example

### 1. Validate Configuration

```bash
pnpm kbr generate
```

### 2. Check Generated Secrets

```bash
cat output/ingressControllerApp.yml | grep -A 5 "kind: Secret"
```

### 3. Verify Environment Variables

```bash
cat output/ingressControllerApp.yml | grep -A 10 "env:"
```

## 🔍 Troubleshooting

### Error: Missing targetName

```
Error: [TlsSecretProvider] Missing targetName (.forName) for env injection.
```

**Solution**: Add `.forName('ENV_VAR_NAME')` before `.inject()`:

```typescript
c.secrets('INGRESS_TLS')
  .forName('TLS_CERT')  // ← Add this
  .inject('env', { key: 'tls.crt' });
```

### Error: Invalid key

```
Error: [TlsSecretProvider] Invalid key 'ca.crt'. Must be 'tls.crt' or 'tls.key'.
```

**Solution**: Use only `'tls.crt'` or `'tls.key'` as key values:

```typescript
.inject('env', { key: 'tls.crt' })  // ✅ Correct
.inject('env', { key: 'ca.crt' })    // ❌ Invalid
```

### Error: Missing key

```
Error: [TlsSecretProvider] 'key' is required for env injection.
```

**Solution**: Provide the `key` parameter:

```typescript
.inject('env', { key: 'tls.crt' })  // ✅ Correct
.inject('env')                       // ❌ Missing key
```

### Error: Conflict detected

```
Error: [conflict:k8s] Conflict detected: key "tls.crt" already exists in Secret "ingress-tls" in namespace "default"
```

**Cause**: Multiple secrets are trying to use the same provider instance, which creates a single Kubernetes Secret resource. Since `kubernetes.io/tls` secrets only have `tls.crt` and `tls.key` keys, trying to merge multiple certificates into one Secret causes conflicts.

**Solution**: Create separate provider instances for each certificate:

```typescript
// ❌ Wrong - reusing same provider
.addProvider('TlsSecretProvider', new TlsSecretProvider({
  name: 'ingress-tls'
}))
.addSecret({ name: 'INGRESS_TLS' })
.addSecret({ name: 'API_TLS' })  // Conflict!

// ✅ Correct - separate providers
.addProvider('IngressTlsProvider', new TlsSecretProvider({
  name: 'ingress-tls'
}))
.addProvider('ApiTlsProvider', new TlsSecretProvider({
  name: 'api-tls'
}))
.addSecret({ name: 'INGRESS_TLS', provider: 'IngressTlsProvider' })
.addSecret({ name: 'API_TLS', provider: 'ApiTlsProvider' })
```

See the [Why Separate Providers?](#why-separate-providers) section for more details.

### Error: Mixed injection strategies

```
Error: [TlsSecretProvider] Mixed injection strategies are not allowed.
Expected all injections to use 'env' but found: env, envFrom.
```

**Cause**: Attempting to use both `env` and `envFrom` strategies with the same provider and custom `targetPath` that causes them to be grouped together.

**Solution**: Don't mix strategies. Use either `env` OR `envFrom`, not both:

```typescript
// ❌ Wrong - mixing strategies
c.secrets('TLS')
  .forName('CERT')
  .inject('env', { key: 'tls.crt', targetPath: 'custom.path' });
c.secrets('TLS')
  .inject('envFrom', { prefix: 'TLS_', targetPath: 'custom.path' });

// ✅ Correct - use only one strategy
c.secrets('TLS')
  .forName('CERT')
  .inject('env', { key: 'tls.crt' });
c.secrets('TLS')
  .forName('KEY')
  .inject('env', { key: 'tls.key' });
```

### Error: Multiple envFrom prefixes detected

```
Error: [TlsSecretProvider] Multiple envFrom prefixes detected: INGRESS_, API_.
All envFrom injections for the same secret must use the same prefix.
```

**Cause**: Trying to use different prefixes for envFrom injections to the same provider instance.

**Why this happens**: Each provider instance represents **one** Kubernetes Secret. That secret can only be injected with **one** prefix value.

**Solution**: Use separate provider instances for different secrets:

```typescript
// ❌ Wrong - different prefixes for same provider
.addProvider('TlsProvider', new TlsSecretProvider({ name: 'shared-tls' }))
c.secrets('INGRESS_TLS').inject('envFrom', { prefix: 'INGRESS_' });
c.secrets('API_TLS').inject('envFrom', { prefix: 'API_' });

// ✅ Correct - separate providers for different secrets
.addProvider('IngressProvider', new TlsSecretProvider({ name: 'ingress-tls' }))
.addProvider('ApiProvider', new TlsSecretProvider({ name: 'api-tls' }))
c.secrets('INGRESS_TLS', { provider: 'IngressProvider' }).inject('envFrom', { prefix: 'INGRESS_' });
c.secrets('API_TLS', { provider: 'ApiProvider' }).inject('envFrom', { prefix: 'API_' });
```

## 📖 Documentation

For more information about secret management in Kubricate:

- [Official Documentation](https://kubricate.thaitype.dev)
- [Secret Management Guide](../../docs/secrets.md)
- [TlsSecretProvider API](../../packages/plugin-kubernetes/README.md)

## 🤝 Related Examples

- [with-basic-auth-secret](../with-basic-auth-secret) - BasicAuth secret management example
- [with-secret-manager](../with-secret-manager) - General secret management example
- [with-stack-template](../with-stack-template) - Basic stack creation

## 📝 Notes

- TlsSecretProvider is part of `@kubricate/plugin-kubernetes` package
- Certificates and keys are base64-encoded automatically
- The Secret type `kubernetes.io/tls` is a Kubernetes built-in type
- This provider enforces Kubernetes spec compliance (tls.crt + tls.key only)
- **Production Note**: While this example uses environment variables, production deployments typically mount TLS certificates as volumes for better security
