import { EnvConnector } from '@kubricate/plugin-env';
import { CustomTypeSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

import { config } from './shared-config';

/**
 * Setup SecretManager with CustomTypeSecretProvider
 *
 * This example demonstrates how to use CustomTypeSecretProvider to manage
 * custom Kubernetes Secret types with user-defined type and dynamic keys.
 *
 * CustomTypeSecretProvider is perfect for:
 * - Third-party integrations requiring custom secret types
 * - Internal conventions with specific secret type naming
 * - Flexible key/value secrets that don't fit standard types
 */
export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  // Provider for vendor API credentials (custom type: vendor.com/api-credentials)
  .addProvider(
    'VendorApiProvider',
    new CustomTypeSecretProvider({
      name: 'vendor-api-secret',
      namespace: config.namespace,
      secretType: 'vendor.com/api-credentials',
      // Optional: restrict allowed keys for type safety
      allowedKeys: ['api_key', 'api_endpoint', 'api_timeout'],
    })
  )
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('VendorApiProvider')
  // Add vendor API credentials with custom type
  .addSecret({
    name: 'VENDOR_API_CONFIG',
    provider: 'VendorApiProvider',
  });
