import { EnvConnector } from '@kubricate/plugin-env';
import { SshAuthSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

import { config } from './shared-config';

/**
 * Setup SecretManager with SshAuthSecretProvider
 *
 * This example demonstrates how to use SshAuthSecretProvider to manage
 * kubernetes.io/ssh-auth secrets for Git repository access and SSH tunneling.
 */
export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  // Provider for Git SSH credentials
  .addProvider(
    'GitSshProvider',
    new SshAuthSecretProvider({
      name: 'git-ssh-credentials',
      namespace: config.namespace,
    })
  )
  // Provider for deployment SSH credentials
  .addProvider(
    'DeploySshProvider',
    new SshAuthSecretProvider({
      name: 'deploy-ssh-credentials',
      namespace: config.namespace,
    })
  )
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('GitSshProvider')
  // Add SSH credentials for Git access
  .addSecret({
    name: 'GIT_SSH_KEY',
    provider: 'GitSshProvider',
  })
  // Add SSH credentials for deployment
  .addSecret({
    name: 'DEPLOY_SSH_KEY',
    provider: 'DeploySshProvider',
  });
