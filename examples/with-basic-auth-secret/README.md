# Example: With Basic Auth Secret

This example demonstrates how to use **BasicAuthSecretProvider** to manage `kubernetes.io/basic-auth` secrets in your Kubernetes deployments.

## 📖 Overview

This example shows three different patterns for using BasicAuthSecretProvider:

1. **Individual key injection** - Inject `username` and `password` as separate environment variables
2. **Bulk injection with prefix** - Use `envFrom` to inject both credentials with a prefix
3. **Bulk injection without prefix** - Use `envFrom` to inject credentials directly

## 🏗️ What's Included

### Stacks

- **namespace** - Default namespace
- **apiServiceApp** - API service using individual env injection (`env` with `key`)
- **dbClientApp** - Database client using bulk injection with prefix (`envFrom` with `prefix`)
- **workerApp** - Background worker using bulk injection without prefix (`envFrom`)

### Features Demonstrated

- ✅ `kubernetes.io/basic-auth` Secret type generation
- ✅ Individual key selection with `inject('env', { key: 'username' })`
- ✅ Bulk injection with `inject('envFrom', { prefix: 'DB_' })`
- ✅ Type-safe credential management
- ✅ Multiple deployment patterns in one example

## 🚀 Quick Start

### 1. Setup Environment Variables

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit `.env` to set your credentials:

```bash
# API Credentials
API_CREDENTIALS={"username":"your-api-user","password":"your-api-password"}

# Database Credentials
DB_CREDENTIALS={"username":"your-db-user","password":"your-db-password"}
```

### 2. Generate Kubernetes Manifests

Run the following command to generate resources:

```bash
pnpm --filter=@examples/with-basic-auth-secret kubricate generate
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
- `apiServiceApp.yml` - API service with individual env vars
- `dbClientApp.yml` - Database client with prefixed env vars
- `workerApp.yml` - Worker with direct env vars

## 📋 Generated Resources Explained

### API Service (Individual Key Injection)

The API service uses **individual key injection** to set specific environment variable names:

```typescript
c.secrets('API_CREDENTIALS')
  .forName('API_USERNAME')
  .inject('env', { key: 'username' });

c.secrets('API_CREDENTIALS')
  .forName('API_PASSWORD')
  .inject('env', { key: 'password' });
```

**Generated YAML**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-credentials
  namespace: default
type: kubernetes.io/basic-auth
data:
  username: <base64-encoded-username>
  password: <base64-encoded-password>
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: api-service
        env:
        - name: API_USERNAME
          valueFrom:
            secretKeyRef:
              name: api-credentials
              key: username
        - name: API_PASSWORD
          valueFrom:
            secretKeyRef:
              name: api-credentials
              key: password
```

### Database Client (Bulk Injection with Prefix)

The database client uses **envFrom with prefix** for bulk injection:

```typescript
c.secrets('DB_CREDENTIALS').inject('envFrom', { prefix: 'DB_' });
```

**Generated YAML**:
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: db-client
        envFrom:
        - prefix: DB_
          secretRef:
            name: api-credentials
```

**Resulting Environment Variables**:
- `DB_username=<value>`
- `DB_password=<value>`

### Background Worker (Bulk Injection without Prefix)

The worker uses **envFrom without prefix**:

```typescript
c.secrets('API_CREDENTIALS').inject('envFrom');
```

**Resulting Environment Variables**:
- `username=<value>`
- `password=<value>`

## 🔐 Secret Management

### Format

BasicAuthSecretProvider expects secrets in JSON format with `username` and `password` keys:

```json
{
  "username": "your-username",
  "password": "your-password"
}
```

### Loading Secrets

In this example, secrets are loaded from `.env` file using `EnvConnector`:

```typescript
export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('BasicAuthSecretProvider', new BasicAuthSecretProvider({
    name: 'api-credentials',
    namespace: 'default',
  }))
  .addSecret({ name: 'API_CREDENTIALS' })
  .addSecret({ name: 'DB_CREDENTIALS' });
```

### Validation

BasicAuthSecretProvider validates that secrets contain both `username` and `password` fields. Invalid secrets will fail at build time with clear error messages.

## 🎯 Use Cases

This pattern is useful for:

- 🔌 **API Authentication** - HTTP Basic Auth for REST APIs
- 🗄️ **Database Connections** - MySQL, PostgreSQL basic authentication
- 🔐 **Service-to-Service Auth** - Internal service authentication
- 📡 **Proxy Authentication** - HTTP proxy credentials
- 🌐 **Legacy Systems** - Systems requiring basic authentication

## 📚 Key Concepts

### Individual Key Injection (`env`)

When you need **granular control** over environment variable names:

```typescript
.inject('env', { key: 'username' })  // Select specific key
.forName('CUSTOM_ENV_NAME')          // Set custom env var name
```

**Required**:
- ✅ Must use `.forName()` to specify environment variable name
- ✅ Must provide `key` parameter ('username' or 'password')

### Bulk Injection (`envFrom`)

When you want to **inject all credentials** at once:

```typescript
.inject('envFrom')                    // No prefix
.inject('envFrom', { prefix: 'DB_' }) // With prefix
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
cat output/apiServiceApp.yml | grep -A 5 "kind: Secret"
```

### 3. Verify Environment Variables

```bash
cat output/apiServiceApp.yml | grep -A 10 "env:"
```

## 🔍 Troubleshooting

### Error: Missing targetName

```
Error: [BasicAuthSecretProvider] Missing targetName (.forName) for env injection.
```

**Solution**: Add `.forName('ENV_VAR_NAME')` before `.inject()`:

```typescript
c.secrets('API_CREDENTIALS')
  .forName('API_USERNAME')  // ← Add this
  .inject('env', { key: 'username' });
```

### Error: Invalid key

```
Error: [BasicAuthSecretProvider] Invalid key 'email'. Must be 'username' or 'password'.
```

**Solution**: Use only `'username'` or `'password'` as key values:

```typescript
.inject('env', { key: 'username' })  // ✅ Correct
.inject('env', { key: 'email' })     // ❌ Invalid
```

### Error: Missing key

```
Error: [BasicAuthSecretProvider] 'key' is required for env injection.
```

**Solution**: Provide the `key` parameter:

```typescript
.inject('env', { key: 'username' })  // ✅ Correct
.inject('env')                       // ❌ Missing key
```

## 📖 Documentation

For more information about secret management in Kubricate:

- [Official Documentation](https://kubricate.thaitype.dev)
- [Secret Management Guide](../../docs/secrets.md)
- [BasicAuthSecretProvider API](../../packages/plugin-kubernetes/README.md)

## 🤝 Related Examples

- [with-secret-manager](../with-secret-manager) - General secret management example
- [with-stack-template](../with-stack-template) - Basic stack creation

## 📝 Notes

- BasicAuthSecretProvider is part of `@kubricate/plugin-kubernetes` package
- Secrets are base64-encoded automatically
- The Secret type `kubernetes.io/basic-auth` is a Kubernetes built-in type
- This provider enforces Kubernetes spec compliance (username + password only)
