import { EnvConnector } from '@kubricate/plugin-env';
import { BasicAuthSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

/**
 * Setup SecretManager with BasicAuthSecretProvider
 *
 * This example demonstrates how to use BasicAuthSecretProvider to manage
 * kubernetes.io/basic-auth secrets for API authentication.
 */
export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider(
    'BasicAuthSecretProvider',
    new BasicAuthSecretProvider({
      name: 'api-credentials',
      namespace: 'default',
    })
  )
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('BasicAuthSecretProvider')
  // Add basic auth credentials for API access
  .addSecret({
    name: 'API_CREDENTIALS',
    provider: 'BasicAuthSecretProvider',
  })
  // Add basic auth credentials for database
  .addSecret({
    name: 'DB_CREDENTIALS',
    provider: 'BasicAuthSecretProvider',
  });
