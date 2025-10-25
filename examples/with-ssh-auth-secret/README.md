# SSH Authentication Secret Example

This example demonstrates how to use `SshAuthSecretProvider` to manage Kubernetes `kubernetes.io/ssh-auth` secrets for Git repository access, SSH-based deployments, and SSH tunneling.

## Overview

The `SshAuthSecretProvider` supports the standard Kubernetes SSH authentication secret type with:
- **Required**: `ssh-privatekey` - The SSH private key
- **Optional**: `known_hosts` - Known hosts file for host verification

## What You'll Learn

This example demonstrates three injection patterns:

1. **Individual Key Injection (env)** - Inject specific keys as separate environment variables
2. **Bulk Injection with Prefix (envFrom)** - Inject all keys with a custom prefix
3. **Bulk Injection without Prefix (envFrom)** - Inject all keys with their original names

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Secrets

Copy the example environment file and add your SSH credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your SSH private key and known_hosts:

```env
KUBRICATE_SECRET_GIT_SSH_KEY={"ssh-privatekey":"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----","known_hosts":"github.com ssh-rsa AAAAB3NzaC1..."}
```

**Important**:
- Escape newlines in your SSH key as `\n`
- The `known_hosts` field is optional
- Never commit the `.env` file with real credentials to version control

### 3. Generate Manifests

```bash
pnpm kbr generate
```

This will generate Kubernetes manifests in the `dist/` directory.

## Usage Examples

### Example 1: Individual Key Injection (env)

**Use Case**: When you need fine-grained control over environment variable names.

```typescript
Stack.fromTemplate(simpleAppTemplate, {
  namespace: 'default',
  imageName: 'alpine/git',
  name: 'git-clone-service',
})
  .useSecrets(secretManager, c => {
    c.secrets('GIT_SSH_KEY')
      .forName('SSH_PRIVATE_KEY')
      .inject('env', { key: 'ssh-privatekey' });

    c.secrets('GIT_SSH_KEY')
      .forName('SSH_KNOWN_HOSTS')
      .inject('env', { key: 'known_hosts' });
  });
```

**Result**: Creates environment variables:
- `SSH_PRIVATE_KEY` → value of `ssh-privatekey`
- `SSH_KNOWN_HOSTS` → value of `known_hosts`

**Generated YAML**:
```yaml
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

**Use Case**: When you want all SSH credentials available with a namespace prefix to avoid conflicts.

```typescript
Stack.fromTemplate(simpleAppTemplate, {
  namespace: 'default',
  imageName: 'deployment-runner',
  name: 'deployment-service',
})
  .useSecrets(secretManager, c => {
    c.secrets('DEPLOY_SSH_KEY')
      .inject('envFrom', { prefix: 'DEPLOY_' });
  });
```

**Result**: Creates environment variables:
- `DEPLOY_ssh-privatekey` → value of `ssh-privatekey`
- `DEPLOY_known_hosts` → value of `known_hosts`

**Generated YAML**:
```yaml
envFrom:
- prefix: DEPLOY_
  secretRef:
    name: deploy-ssh-credentials
```

### Example 3: Bulk Injection without Prefix (envFrom)

**Use Case**: When you want all SSH credentials with their original key names.

```typescript
Stack.fromTemplate(simpleAppTemplate, {
  namespace: 'default',
  imageName: 'ssh-tunnel',
  name: 'ssh-tunnel-worker',
})
  .useSecrets(secretManager, c => {
    c.secrets('GIT_SSH_KEY')
      .inject('envFrom');
  });
```

**Result**: Creates environment variables:
- `ssh-privatekey` → value of `ssh-privatekey`
- `known_hosts` → value of `known_hosts`

**Generated YAML**:
```yaml
envFrom:
- secretRef:
    name: git-ssh-credentials
```

## Secret Format

The SSH authentication secret follows the Kubernetes `kubernetes.io/ssh-auth` specification:

```json
{
  "ssh-privatekey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
  "known_hosts": "github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7..."
}
```

### Generating SSH Keys

To generate a new SSH key pair:

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com" -f ~/.ssh/id_rsa_kubricate
```

### Getting known_hosts

To get the known_hosts entry for a server:

```bash
ssh-keyscan github.com
```

## Common Use Cases

### 1. Git Clone in CI/CD

Use SSH keys to clone private repositories:

```bash
# Inside your container
git clone git@github.com:user/private-repo.git
```

### 2. SSH-Based Deployments

Deploy to servers using SSH:

```bash
# Inside your container
ssh deploy-user@server "cd /app && git pull"
```

### 3. SSH Tunneling

Create secure tunnels to services:

```bash
# Inside your container
ssh -L 3306:localhost:3306 tunnel-user@db-server
```

## Troubleshooting

### Issue: SSH key not recognized

**Solution**: Ensure your private key is properly formatted with `\n` for newlines in the JSON:

```json
{"ssh-privatekey":"-----BEGIN OPENSSH PRIVATE KEY-----\nline1\nline2\n-----END OPENSSH PRIVATE KEY-----"}
```

### Issue: Host verification failed

**Solution**: Add the server's host key to `known_hosts`:

```bash
ssh-keyscan your-server.com >> ~/.ssh/known_hosts
```

Then copy the content to your secret configuration.

### Issue: Permission denied (publickey)

**Checklist**:
1. Verify the private key matches the public key registered on the server
2. Check file permissions (SSH keys should be mode 600)
3. Ensure the key is in the correct format (OpenSSH vs. RSA)
4. Verify the username is correct for SSH connections

### Issue: Mixed injection strategies error

**Error**: `Mixed injection strategies are not allowed`

**Solution**: Don't mix `env` and `envFrom` injections for the same secret. Choose one strategy:

```typescript
// ❌ Wrong - mixing strategies
c.secrets('SSH_KEY').forName('KEY1').inject('env', { key: 'ssh-privatekey' });
c.secrets('SSH_KEY').inject('envFrom');

// ✅ Correct - use one strategy
c.secrets('SSH_KEY').forName('KEY1').inject('env', { key: 'ssh-privatekey' });
c.secrets('SSH_KEY').forName('KEY2').inject('env', { key: 'known_hosts' });
```

### Issue: Multiple prefixes detected

**Error**: `Multiple envFrom prefixes detected`

**Solution**: Use the same prefix (or no prefix) for all envFrom injections:

```typescript
// ❌ Wrong - different prefixes
c.secrets('SSH_KEY').inject('envFrom', { prefix: 'GIT_' });
c.secrets('SSH_KEY').inject('envFrom', { prefix: 'SSH_' });

// ✅ Correct - same prefix
c.secrets('SSH_KEY').inject('envFrom', { prefix: 'GIT_' });
c.secrets('SSH_KEY').inject('envFrom', { prefix: 'GIT_' });
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use `.env` for local development** only (add to `.gitignore`)
3. **Rotate keys regularly** in production environments
4. **Use different keys** for different environments (dev, staging, production)
5. **Limit key permissions** to only what's needed
6. **Monitor key usage** and audit access logs
7. **Use known_hosts** to prevent man-in-the-middle attacks

## File Structure

```
with-ssh-auth-secret/
├── src/
│   ├── shared-config.ts      # Shared configuration (namespace, etc.)
│   ├── setup-secrets.ts       # SecretManager configuration
│   └── stacks.ts              # Stack definitions with secret injection
├── .env.example               # Example environment variables (template)
├── .env                       # Your actual secrets (DO NOT COMMIT)
├── kubricate.config.ts        # Kubricate configuration
├── package.json               # Project dependencies
└── README.md                  # This file
```

## Next Steps

- Learn about [Secret Management](https://github.com/thaitype/kubricate/tree/main/examples/with-secret-manager)
- Explore [BasicAuthSecretProvider](https://github.com/thaitype/kubricate/tree/main/examples/with-basic-auth-secret)
- Read the [Kubricate Documentation](https://github.com/thaitype/kubricate)

## License

Apache-2.0
