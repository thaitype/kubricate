import { EnvConnector } from '@kubricate/plugin-env';
import { BasicAuthSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

import { config } from './shared-config';

/**
 * Setup SecretManager with BasicAuthSecretProvider
 *
 * This example demonstrates how to use BasicAuthSecretProvider to manage
 * kubernetes.io/basic-auth secrets for API authentication.
 */
export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  // Provider for API credentials
  .addProvider(
    'ApiCredentialsProvider',
    new BasicAuthSecretProvider({
      name: 'api-credentials',
      namespace: config.namespace,
    })
  )
  // Provider for database credentials
  .addProvider(
    'DbCredentialsProvider',
    new BasicAuthSecretProvider({
      name: 'db-credentials',
      namespace: config.namespace,
    })
  )
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('ApiCredentialsProvider')
  // Add basic auth credentials for API access
  .addSecret({
    name: 'API_CREDENTIALS',
    provider: 'ApiCredentialsProvider',
  })
  // Add basic auth credentials for database
  .addSecret({
    name: 'DB_CREDENTIALS',
    provider: 'DbCredentialsProvider',
  });
