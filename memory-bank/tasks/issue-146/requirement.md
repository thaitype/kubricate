# Introduction

This requirement document specifies the implementation of **SshAuthSecretProvider** for managing Kubernetes `kubernetes.io/ssh-auth` secrets in Kubricate.

## Background

Following the successful implementation of `BasicAuthSecretProvider` (#140), users need similar support for SSH authentication secrets. SSH secrets are commonly used for:
- Git repository access (private repos, CI/CD)
- SSH-based deployments
- Secure shell access to services
- SSH tunneling and port forwarding

## Goal

Implement `SshAuthSecretProvider` that:
- Validates and materializes `kubernetes.io/ssh-auth` Secrets
- Supports both per-key injection (`env`) and bulk injection (`envFrom`) strategies
- Maintains API consistency with `BasicAuthSecretProvider`
- Integrates seamlessly with existing merge handler and provider architecture

## Scope

**In Scope:**
- SshAuthSecretProvider implementation in `@kubricate/plugin-kubernetes`
- Support for `ssh-privatekey` (required) and `known_hosts` (optional) keys
- Both `env` and `envFrom` injection strategies
- Comprehensive validation and error handling
- Test suite with 35+ tests
- Example project demonstrating usage patterns

**Out of Scope:**
- SSH key generation or rotation
- SSH agent integration
- Key pair management
- Multi-key SSH authentication

# Glossary

- **SSH Auth Secret** - Kubernetes Secret type `kubernetes.io/ssh-auth` containing SSH private key and optionally known_hosts file
- **ssh-privatekey** - Required key in SSH auth secret containing the private SSH key
- **known_hosts** - Optional key containing SSH known_hosts file for host verification
- **env injection** - Strategy for injecting individual secret keys as separate environment variables
- **envFrom injection** - Strategy for bulk-injecting all secret keys with optional prefix
- **Provider instance** - Single instance of SshAuthSecretProvider representing one Kubernetes Secret resource
- **Strategy homogeneity** - Requirement that all injections for the same provider use the same strategy kind
- **Prefix consistency** - Requirement that all envFrom injections use the same prefix value
- **Base64 encoding** - Kubernetes requirement for encoding Secret data values

# Requirement

## Functional Requirement

### FR-1: Secret Schema and Validation

**FR-1.1** The provider MUST validate secrets using the following Zod schema:
```typescript
export const sshAuthSecretSchema = z.object({
  'ssh-privatekey': z.string().min(1, 'ssh-privatekey is required'),
  known_hosts: z.string().optional(),
});
```

**FR-1.2** The provider MUST require `ssh-privatekey` field
**FR-1.3** The provider MAY accept optional `known_hosts` field
**FR-1.4** The provider MUST reject secrets with missing `ssh-privatekey`
**FR-1.5** The provider MUST reject non-object inputs

### FR-2: Provider Configuration

**FR-2.1** The provider MUST accept configuration with the following interface:
```typescript
export interface SshAuthSecretProviderConfig {
  name: string;           // Secret name to create or reference
  namespace?: string;     // Namespace (default: 'default')
}
```

**FR-2.2** The provider MUST use 'default' namespace when not specified

### FR-3: Provider Metadata

**FR-3.1** The provider MUST set `secretType = 'Kubernetes.Secret.SshAuth'`
**FR-3.2** The provider MUST set `targetKind = 'Deployment'`
**FR-3.3** The provider MUST set `supportedStrategies = ['env', 'envFrom']`
**FR-3.4** The provider MUST set `allowMerge = true`

### FR-4: Secret Preparation

**FR-4.1** The provider MUST generate Kubernetes Secret with:
- `apiVersion: 'v1'`
- `kind: 'Secret'`
- `type: 'kubernetes.io/ssh-auth'`
- `metadata.name` from config
- `metadata.namespace` from config or 'default'

**FR-4.2** The provider MUST Base64-encode all secret values in `.data`
**FR-4.3** The provider MUST include `ssh-privatekey` in Secret data
**FR-4.4** The provider MUST include `known_hosts` in Secret data only when provided

### FR-5: Target Path Resolution

**FR-5.1** For `env` strategy, the provider MUST default to:
`spec.template.spec.containers[{containerIndex ?? 0}].env`

**FR-5.2** For `envFrom` strategy, the provider MUST default to:
`spec.template.spec.containers[{containerIndex ?? 0}].envFrom`

**FR-5.3** The provider MUST honor custom `targetPath` when provided
**FR-5.4** The provider MUST throw for unsupported strategy kinds

### FR-6: env Injection Strategy

**FR-6.1** Each env injection MUST specify `meta.targetName` (environment variable name)
**FR-6.2** Each env injection MUST specify `strategy.key` as one of: `'ssh-privatekey' | 'known_hosts'`
**FR-6.3** The provider MUST throw when `meta.targetName` is missing
**FR-6.4** The provider MUST throw when `strategy.key` is missing with message:
`"[SshAuthSecretProvider] 'key' is required for env injection. Must be 'ssh-privatekey' or 'known_hosts'."`
**FR-6.5** The provider MUST throw when `strategy.key` is invalid with message:
`"[SshAuthSecretProvider] Invalid key '<key>'. Must be 'ssh-privatekey' or 'known_hosts'."`

**FR-6.6** The provider MUST generate EnvVar entries:
```typescript
{
  name: <meta.targetName>,
  valueFrom: {
    secretKeyRef: {
      name: this.config.name,
      key: <strategy.key>
    }
  }
}
```

### FR-7: envFrom Injection Strategy

**FR-7.1** The provider MUST validate all injections use `envFrom` strategy
**FR-7.2** The provider MUST enforce prefix consistency - all injections must use identical prefix (including undefined)
**FR-7.3** The provider MUST throw when different prefixes are detected
**FR-7.4** The provider MUST collapse multiple envFrom injections into single EnvFromSource:
```typescript
{
  ...(prefix && { prefix }),
  secretRef: { name: this.config.name }
}
```

### FR-8: Strategy Homogeneity Validation

**FR-8.1** The provider MUST validate all injections use the same strategy kind
**FR-8.2** The provider MUST throw when mixed strategies are detected (env + envFrom)
**FR-8.3** Error message MUST include detected strategy kinds
**FR-8.4** Error message MUST hint at "framework bug or incorrect targetPath configuration"

### FR-9: Secret Merging

**FR-9.1** The provider MUST use `createKubernetesMergeHandler()` for merging effects
**FR-9.2** The provider MUST detect duplicate key conflicts
**FR-9.3** The provider MUST throw on merge conflicts with clear error messages

### FR-10: Effect Identification

**FR-10.1** The provider MUST generate effect identifier as `{namespace}/{name}`
**FR-10.2** The provider MUST use 'default' when namespace is omitted

## Non-Functional Requirement

### NFR-1: Code Quality

**NFR-1.1** Code MUST follow existing provider patterns (BasicAuthSecretProvider, OpaqueSecretProvider)
**NFR-1.2** Code MUST use TypeScript with strict typing
**NFR-1.3** Code MUST include comprehensive JSDoc documentation
**NFR-1.4** Error messages MUST be consistent with BasicAuthSecretProvider style

### NFR-2: Testing

**NFR-2.1** Test coverage MUST be ≥98%
**NFR-2.2** Test suite MUST include minimum 35 tests covering all scenarios
**NFR-2.3** All tests MUST pass before merge
**NFR-2.4** Tests MUST cover both success and error paths

### NFR-3: Performance

**NFR-3.1** Validation MUST be fail-fast (early error detection)
**NFR-3.2** No performance regression compared to other providers
**NFR-3.3** Minimal memory allocation during injection payload generation

### NFR-4: Maintainability

**NFR-4.1** Code MUST be consistent with existing provider architecture
**NFR-4.2** Validation logic MUST be clearly separated
**NFR-4.3** Helper methods MUST be private and well-documented
**NFR-4.4** Error messages MUST be actionable and specific

### NFR-5: Compatibility

**NFR-5.1** Implementation MUST be backward compatible (no breaking changes)
**NFR-5.2** Must work with existing merge handler
**NFR-5.3** Must integrate with existing SecretManager API
**NFR-5.4** Type system changes must be additive only

### NFR-6: Security

**NFR-6.1** No secrets logged in error messages
**NFR-6.2** Base64 encoding must be correct
**NFR-6.3** No hardcoded credentials in tests
**NFR-6.4** Validation prevents injection attacks

# Diagram/User Interface

## API Usage Examples

### Example 1: Individual Key Injection (env)

```typescript
import { SshAuthSecretProvider } from '@kubricate/plugin-kubernetes';

const secretManager = new SecretManager()
  .addProvider('GitSshProvider', new SshAuthSecretProvider({
    name: 'git-ssh-credentials',
    namespace: 'default',
  }))
  .addSecret({ name: 'GIT_SSH_KEY', provider: 'GitSshProvider' });

// In stack configuration
c.secrets('GIT_SSH_KEY')
  .forName('SSH_PRIVATE_KEY')
  .inject('env', { key: 'ssh-privatekey' });

c.secrets('GIT_SSH_KEY')
  .forName('SSH_KNOWN_HOSTS')
  .inject('env', { key: 'known_hosts' });
```

**Generated YAML:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-credentials
  namespace: default
type: kubernetes.io/ssh-auth
data:
  ssh-privatekey: <base64-encoded-key>
  known_hosts: <base64-encoded-hosts>
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: SSH_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: git-ssh-credentials
              key: ssh-privatekey
        - name: SSH_KNOWN_HOSTS
          valueFrom:
            secretKeyRef:
              name: git-ssh-credentials
              key: known_hosts
```

### Example 2: Bulk Injection with Prefix (envFrom)

```typescript
c.secrets('GIT_SSH_KEY')
  .inject('envFrom', { prefix: 'GIT_' });
```

**Generated YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - prefix: GIT_
          secretRef:
            name: git-ssh-credentials
```

**Resulting Environment Variables:**
- `GIT_ssh-privatekey=<value>`
- `GIT_known_hosts=<value>` (if provided)

### Example 3: Bulk Injection without Prefix

```typescript
c.secrets('GIT_SSH_KEY')
  .inject('envFrom');
```

**Resulting Environment Variables:**
- `ssh-privatekey=<value>`
- `known_hosts=<value>` (if provided)

## Secret Value Format

```json
{
  "ssh-privatekey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
  "known_hosts": "github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A..."
}
```

## Error Scenarios

### Error 1: Missing ssh-privatekey
```typescript
// Input: { known_hosts: "..." }
// Error: ZodError - ssh-privatekey is required
```

### Error 2: Missing key parameter
```typescript
c.secrets('GIT_SSH_KEY')
  .forName('SSH_KEY')
  .inject('env');  // Missing { key: '...' }

// Error: [SshAuthSecretProvider] 'key' is required for env injection.
```

### Error 3: Invalid key
```typescript
c.secrets('GIT_SSH_KEY')
  .forName('SSH_KEY')
  .inject('env', { key: 'username' });  // Wrong key

// Error: [SshAuthSecretProvider] Invalid key 'username'. Must be 'ssh-privatekey' or 'known_hosts'.
```

### Error 4: Mixed strategies
```typescript
c.secrets('GIT_SSH_KEY')
  .forName('KEY1')
  .inject('env', { key: 'ssh-privatekey', targetPath: 'custom.path' });

c.secrets('GIT_SSH_KEY')
  .inject('envFrom', { targetPath: 'custom.path' });

// Error: [SshAuthSecretProvider] Mixed injection strategies are not allowed.
// Expected all injections to use 'env' but found: env, envFrom.
```

### Error 5: Multiple prefixes
```typescript
c.secrets('GIT_SSH_KEY')
  .inject('envFrom', { prefix: 'GIT_' });

c.secrets('GIT_SSH_KEY')
  .inject('envFrom', { prefix: 'SSH_' });

// Error: [SshAuthSecretProvider] Multiple envFrom prefixes detected: GIT_, SSH_.
// All envFrom injections for the same secret must use the same prefix.
```

# Acceptance Criteria

## AC-1: Core Implementation
- ✅ SshAuthSecretProvider class implemented in `packages/plugin-kubernetes/src/SshAuthSecretProvider.ts`
- ✅ Exports `sshAuthSecretSchema` and `SshAuthSecretProviderConfig` interface
- ✅ Implements all required provider methods
- ✅ Uses Base64 encoding for secret data
- ✅ Integrates with `createKubernetesMergeHandler()`

## AC-2: Validation
- ✅ Validates secret schema with Zod
- ✅ Validates strategy homogeneity (no mixed env/envFrom)
- ✅ Validates prefix consistency for envFrom
- ✅ Validates key parameter for env injection
- ✅ Validates targetName presence for env injection
- ✅ Throws descriptive errors for all validation failures

## AC-3: env Injection
- ✅ Generates correct EnvVar entries with secretKeyRef
- ✅ Supports both 'ssh-privatekey' and 'known_hosts' keys
- ✅ Honors custom targetName for environment variable names
- ✅ Supports containerIndex parameter
- ✅ Honors custom targetPath when provided

## AC-4: envFrom Injection
- ✅ Generates single EnvFromSource entry
- ✅ Supports optional prefix parameter
- ✅ Collapses multiple envFrom injections correctly
- ✅ Validates prefix consistency across injections
- ✅ Supports containerIndex parameter

## AC-5: Testing
- ✅ Minimum 35 tests implemented in `SshAuthSecretProvider.test.ts`
- ✅ Test coverage ≥98%
- ✅ All tests passing
- ✅ Tests cover all functional requirements
- ✅ Tests cover all error scenarios
- ✅ Tests verify metadata values
- ✅ Tests verify merge behavior

## AC-6: Documentation
- ✅ Comprehensive JSDoc for all public methods
- ✅ JSDoc for getInjectionPayload with examples
- ✅ Error messages consistent with BasicAuthSecretProvider
- ✅ Code comments explaining validation logic

## AC-7: Example Project
- ✅ Example project created in `examples/with-ssh-auth-secret/`
- ✅ Demonstrates all three usage patterns (env, envFrom with prefix, envFrom without prefix)
- ✅ Includes README with troubleshooting guide
- ✅ Includes working .env.example file

## AC-8: Type Safety
- ✅ Full TypeScript support
- ✅ Proper type inference for strategy options
- ✅ No type errors in example project
- ✅ Exports properly typed from package

## AC-9: Integration
- ✅ Builds successfully with pnpm build
- ✅ No breaking changes to existing code
- ✅ All existing tests still pass
- ✅ Works with existing SecretManager API

## AC-10: Quality Assurance
- ✅ Code follows existing patterns
- ✅ No linting errors
- ✅ No security vulnerabilities
- ✅ Ready for production use

# Testing for Dev

## Unit Tests (packages/plugin-kubernetes/src/SshAuthSecretProvider.test.ts)

### Test Suite 1: prepare()
1. ✅ Creates Secret with correct type `kubernetes.io/ssh-auth`
2. ✅ Base64 encodes `ssh-privatekey`
3. ✅ Base64 encodes `known_hosts` when provided
4. ✅ Omits `known_hosts` when not provided
5. ✅ Uses default namespace 'default' when not specified
6. ✅ Uses custom namespace when specified
7. ✅ Throws when `ssh-privatekey` is missing
8. ✅ Throws when input is not an object

### Test Suite 2: getInjectionPayload() - env strategy
9. ✅ Injects `ssh-privatekey` with correct secretKeyRef
10. ✅ Injects `known_hosts` with correct secretKeyRef
11. ✅ Generates multiple EnvVar entries for multiple injections
12. ✅ Throws when `key` is missing
13. ✅ Throws when `key` is invalid (e.g., 'username')
14. ✅ Throws when `targetName` is missing
15. ✅ Uses correct environment variable name from targetName

### Test Suite 3: getInjectionPayload() - envFrom strategy
16. ✅ Generates single EnvFromSource without prefix
17. ✅ Generates single EnvFromSource with prefix
18. ✅ Prefix is correctly applied
19. ✅ Multiple injections with same prefix accepted
20. ✅ Multiple injections with no prefix accepted
21. ✅ Throws when different prefixes detected
22. ✅ Throws when mixing undefined and string prefix
23. ✅ Error message lists all detected prefixes

### Test Suite 4: Strategy Validation
24. ✅ Throws when mixing env and envFrom strategies
25. ✅ Error message includes both strategy kinds
26. ✅ Error message includes framework bug hint
27. ✅ Accepts homogeneous env strategies
28. ✅ Accepts homogeneous envFrom strategies

### Test Suite 5: getTargetPath()
29. ✅ Returns correct default path for env strategy
30. ✅ Returns correct default path for envFrom strategy
31. ✅ Honors containerIndex for env
32. ✅ Honors containerIndex for envFrom
33. ✅ Honors custom targetPath
34. ✅ Throws for unsupported strategy kind

### Test Suite 6: getEffectIdentifier()
35. ✅ Returns namespace/name format
36. ✅ Uses 'default' when namespace omitted

### Test Suite 7: mergeSecrets()
37. ✅ Merges compatible effects
38. ✅ Throws on duplicate key conflicts
39. ✅ Preserves all unique keys

### Test Suite 8: Metadata
40. ✅ secretType is 'Kubernetes.Secret.SshAuth'
41. ✅ targetKind is 'Deployment'
42. ✅ allowMerge is true
43. ✅ supportedStrategies contains ['env', 'envFrom']

## Integration Tests

### Test 1: Example Project
```bash
cd examples/with-ssh-auth-secret
pnpm check-types  # Must pass
pnpm kubricate generate  # Must generate valid YAML
```

### Test 2: Build System
```bash
pnpm build --filter=@kubricate/plugin-kubernetes  # Must succeed
pnpm test --filter=@kubricate/plugin-kubernetes   # All tests pass
```

### Test 3: Full Project
```bash
pnpm build  # All packages build
pnpm test   # All tests pass
```

## Manual Testing Checklist

- [ ] Generate example manifests and inspect YAML
- [ ] Verify Base64 encoding is correct
- [ ] Test with only ssh-privatekey (no known_hosts)
- [ ] Test with both ssh-privatekey and known_hosts
- [ ] Verify error messages are clear and actionable
- [ ] Test with multiple containers (containerIndex)
- [ ] Test with custom targetPath
- [ ] Verify no secrets logged in errors

# Q&A

## Requirement Questions

**Q1: Should we support multiple SSH keys in one Secret?**
A: No. Following the `kubernetes.io/ssh-auth` specification, each Secret contains one private key and optionally one known_hosts file. Use separate provider instances for multiple keys.

**Q2: Should we validate the format of ssh-privatekey (e.g., BEGIN PRIVATE KEY)?**
A: No. We only validate presence (non-empty string). Key format validation should be handled by the consuming application or Kubernetes.

**Q3: Can users mix env and envFrom strategies for the same secret?**
A: No. This is explicitly forbidden and will throw an error. All injections must use the same strategy kind.

**Q4: What happens if user provides known_hosts but doesn't inject it?**
A: The known_hosts will be included in the Secret data but not referenced by any container. This is acceptable - the Secret contains the data, injection is separate.

**Q5: Should we support other SSH-related keys like ssh-publickey?**
A: No. The `kubernetes.io/ssh-auth` type only defines `ssh-privatekey` and `known_hosts`. Public keys are not part of this spec.

## Technical Questions

**Q1: Should we reuse extractStrategy() from BasicAuthSecretProvider?**
A: The implementation should be similar, but keep it within SshAuthSecretProvider for encapsulation. The logic is simple enough that duplication is acceptable.

**Q2: How should we handle the hyphenated key name 'ssh-privatekey' in TypeScript?**
A: Use bracket notation: `value['ssh-privatekey']` or quoted keys in type definitions.

**Q3: Should validation logic be in separate helper methods?**
A: Yes. Follow BasicAuthSecretProvider pattern:
- `getInjectionPayload()` - main validation
- `getEnvInjectionPayload()` - env-specific logic
- `getEnvFromInjectionPayload()` - envFrom-specific logic

**Q4: Should we validate known_hosts format?**
A: No. Only validate it's a string if provided. Format validation is outside scope.

**Q5: How do we handle the 'ssh-privatekey' key name in envFrom?**
A: When using envFrom without prefix, the environment variable will be named `ssh-privatekey` (with hyphen). With prefix 'GIT_', it becomes `GIT_ssh-privatekey`. This is standard Kubernetes behavior.

**Q6: Should we add integration tests beyond unit tests?**
A: The example project serves as an integration test. Ensure it builds and generates valid manifests. No separate integration test suite needed.

**Q7: What's the estimated implementation time?**
A: Based on BasicAuthSecretProvider implementation:
- Core implementation: 3-4 hours
- Tests: 4-5 hours
- Example project: 2-3 hours
- Documentation: 1-2 hours
- **Total: 10-14 hours**

**Q8: Should we create a technical audit before merge?**
A: Yes. Following issue-140 process, perform a production readiness audit after implementation to verify security, testing, and code quality.
