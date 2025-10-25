# Feature: Add SshAuthSecretProvider for Kube secret

> Implementation of SSH authentication secret provider for Kubernetes `kubernetes.io/ssh-auth` secrets

## 🧠 Summary

Implement `SshAuthSecretProvider` to manage Kubernetes SSH authentication secrets (`kubernetes.io/ssh-auth`) with type-safe validation, supporting both individual key injection (`env`) and bulk injection (`envFrom`) strategies, consistent with the `BasicAuthSecretProvider` pattern.

## 🎯 Goal / Motivation

Users need SSH secret support for:
- Git repository access (private repos, CI/CD)
- SSH-based deployments
- Secure shell access to services
- SSH tunneling and port forwarding

**Business Value:**
- Completes coverage of common Kubernetes Secret types
- Maintains API consistency with existing providers
- Provides production-ready SSH secret management

## 📦 Scope

**In Scope**
- `SshAuthSecretProvider` class in `@kubricate/plugin-kubernetes`
- Support for `ssh-privatekey` (required) and `known_hosts` (optional)
- Both `env` and `envFrom` injection strategies
- Comprehensive validation and error handling
- Test suite with ≥98% coverage
- Example project with usage patterns

**Out of Scope**
- SSH key generation/rotation
- SSH agent integration
- Key pair management
- Multi-key authentication

## 🧭 High-Level Design

### Design Overview

Extends `BaseProvider` from `@kubricate/core`:
1. **Validation**: Zod schema for `ssh-privatekey` (required) + `known_hosts` (optional)
2. **Preparation**: Generates Kubernetes Secret type `kubernetes.io/ssh-auth`
3. **Injection**: Supports `env` (individual keys) and `envFrom` (bulk) strategies
4. **Validation**: Enforces strategy homogeneity and prefix consistency
5. **Merging**: Uses `createKubernetesMergeHandler()` for conflict detection

### Configuration Example

```typescript
import { SshAuthSecretProvider } from '@kubricate/plugin-kubernetes';

// Setup provider
const secretManager = new SecretManager()
  .addProvider('GitSsh', new SshAuthSecretProvider({
    name: 'git-ssh-credentials',
    namespace: 'production',
  }))
  .addSecret({ name: 'GIT_SSH_KEY', provider: 'GitSsh' });

// Usage Pattern 1: Individual key injection
stack.secrets('GIT_SSH_KEY')
  .forName('SSH_PRIVATE_KEY')
  .inject('env', { key: 'ssh-privatekey' });

// Usage Pattern 2: Bulk injection with prefix
stack.secrets('GIT_SSH_KEY')
  .inject('envFrom', { prefix: 'GIT_' });

// Usage Pattern 3: Bulk injection without prefix
stack.secrets('GIT_SSH_KEY')
  .inject('envFrom');
```

---

## ⚙️ API Design

### Core Types

> Note: `known_hosts` is not standard Kubernetes Secret key, add as optional.

```typescript
// Schema validation
export const sshAuthSecretSchema = z.object({
  'ssh-privatekey': z.string().min(1),
  known_hosts: z.string().optional(),
});

// Configuration
export interface SshAuthSecretProviderConfig {
  name: string;
  namespace?: string; // defaults to 'default'
}

// Supported strategies
type SupportedStrategies = 'env' | 'envFrom';
```

---

## 🧱 Implementation Notes

### Key Decisions

1. **Pattern Consistency**: Mirrors `BasicAuthSecretProvider` structure exactly
   - Same method organization and validation patterns
   - Identical error message format with `[SshAuthSecretProvider]` prefix
   - Same strategy validation approach

2. **Key Validation** (env strategy):
   - Requires `strategy.key` as `'ssh-privatekey' | 'known_hosts'`
   - Validates `meta.targetName` presence
   - Clear, specific error messages

3. **Strategy Homogeneity**:
   - All injections must use same strategy kind (env or envFrom)
   - Mixed strategies throw error with detected kinds listed

4. **Prefix Consistency** (envFrom):
   - All envFrom injections must share identical prefix
   - Undefined prefix treated as distinct value

5. **Optional Field Handling**:
   - `known_hosts` included in Secret data only when provided
   - Base64-encoded when present

### Technical Details

- **Base64 Encoding**: Uses `js-base64` library
- **Merge Handler**: Shared `createKubernetesMergeHandler()` for conflict detection
- **Error Handling**: Fail-fast validation with descriptive errors
- **Dependencies**: `@kubricate/core`, `zod`, `js-base64`, `@kubricate/kubernetes-models`

