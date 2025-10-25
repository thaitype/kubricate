<!--
feat: Add SshAuthSecretProvider for SSH authentication secrets
Implements kubernetes.io/ssh-auth secret provider with env/envFrom injection strategies
-->

## Summary

Adds `SshAuthSecretProvider` to manage Kubernetes SSH authentication secrets with type-safe validation, supporting both individual key injection (`env`) and bulk injection (`envFrom`) strategies.

- [x] Type: **feat**

## What & Why

**What changed**
- Added `SshAuthSecretProvider` class in `@kubricate/plugin-kubernetes`
- Supports `ssh-privatekey` (required) and `known_hosts` (optional) fields
- Implements both `env` and `envFrom` injection strategies
- Includes Zod schema validation and comprehensive error handling
- Added example project demonstrating 3 usage patterns
- Test coverage: 98.73% (49 tests)

**Why (problem / motivation)**
- Users need SSH secret support for Git repository access, SSH deployments, and secure shell access
- Completes coverage of common Kubernetes Secret types
- Maintains API consistency with existing providers (follows `BasicAuthSecretProvider` pattern)

**Linked issues**
- Closes #146
- Related: #140 (BasicAuthSecretProvider pattern reference)

## Screenshots / Demos

### Usage Example

```typescript
import { SshAuthSecretProvider } from '@kubricate/plugin-kubernetes';

// Setup provider
const secretManager = new SecretManager()
  .addProvider('GitSsh', new SshAuthSecretProvider({
    name: 'git-ssh-credentials',
    namespace: 'production',
  }))
  .addSecret({ name: 'GIT_SSH_KEY', provider: 'GitSsh' });

// Individual key injection (env)
stack.secrets('GIT_SSH_KEY')
  .forName('SSH_PRIVATE_KEY')
  .inject('env', { key: 'ssh-privatekey' });

// Bulk injection (envFrom)
stack.secrets('GIT_SSH_KEY')
  .inject('envFrom', { prefix: 'GIT_' });
```

### Generated Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-credentials
  namespace: production
type: kubernetes.io/ssh-auth
data:
  ssh-privatekey: <base64>
  known_hosts: <base64>
```

### Example .env File

For testing the example project, create a `.env` file:

```bash
# SSH Authentication Secrets
# Replace with your actual SSH private key and known_hosts

# Git SSH Key (required: ssh-privatekey, optional: known_hosts)
KUBRICATE_SECRET_GIT_SSH_KEY={"ssh-privatekey":"-----BEGIN OPENSSH PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END OPENSSH PRIVATE KEY-----","known_hosts":"github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGm..."}

# Deploy SSH Key (only ssh-privatekey required)
KUBRICATE_SECRET_DEPLOY_SSH_KEY={"ssh-privatekey":"-----BEGIN OPENSSH PRIVATE KEY-----\nMIIEpQIBAAKCAQEA...\n-----END OPENSSH PRIVATE KEY-----"}
```

**Note**: The value must be valid JSON with `ssh-privatekey` (required) and optionally `known_hosts` fields.

## How to Test

1. Install dependencies: `pnpm install`
2. Build packages: `pnpm build --filter=@kubricate/plugin-kubernetes`
3. Run tests: `pnpm test --filter=@kubricate/plugin-kubernetes`
4. Try example: `cd examples/with-ssh-auth-secret && pnpm kubricate generate`
5. Expected: All tests pass, example generates valid YAML manifests

## Breaking Changes?

- [x] No breaking changes

**Migration notes**
- N/A - This is a new feature with additive exports only

## Performance / Security / Compatibility

- **Performance impact**: None - follows same pattern as existing providers with fail-fast validation
- **Security considerations**:
  - No secrets in error messages
  - Base64 encoding using `js-base64` library
  - Input validation prevents injection attacks
  - No hardcoded credentials in tests
- **Compatibility**:
  - Node.js ≥22 (existing requirement)
  - Kubernetes API v1 (standard Secret type)
  - Works with existing `SecretManager` and merge handler

## Docs & Changelog

- [x] Code is commented where non-obvious
- [x] Docs updated (example project with README)
- [x] Add release note (one clear sentence)

**Release note**
> Added `SshAuthSecretProvider` for managing Kubernetes SSH authentication secrets with support for both `env` and `envFrom` injection strategies.

## Checklist

- [x] Follows style & lints pass
- [x] Unit/integration tests added (49 tests, 98.73% coverage)
- [x] CI green (build, tests, typecheck)
- [x] Feature flagged or safe by default (additive exports)
- [x] No sensitive data committed

---

## Additional Context

**Files Changed**
- `packages/plugin-kubernetes/src/SshAuthSecretProvider.ts` (new, ~290 lines)
- `packages/plugin-kubernetes/src/SshAuthSecretProvider.test.ts` (new, ~1000 lines)
- `packages/plugin-kubernetes/src/index.ts` (exports added)
- `examples/with-ssh-auth-secret/` (new example project)

**Production Readiness**
- Comprehensive validation and error handling
- Follows established provider patterns
- Example project with 3 usage patterns
- Production readiness review completed
- Ready for immediate release

**Review Documents**
- [Requirements](./requirement.md)
- [Pre-Dev Analysis](./pre-dev-analysis.md)
- [Production Review v2](./production-readiness-review-v2.md)
