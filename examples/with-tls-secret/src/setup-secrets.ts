import { EnvConnector } from '@kubricate/plugin-env';
import { TlsSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

import { config } from './shared-config';

/**
 * Setup SecretManager with TlsSecretProvider
 *
 * This example demonstrates how to use TlsSecretProvider to manage
 * kubernetes.io/tls secrets for TLS certificates and private keys.
 */
export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  // Provider for ingress TLS certificate
  .addProvider(
    'IngressTlsProvider',
    new TlsSecretProvider({
      name: 'ingress-tls',
      namespace: config.namespace,
    })
  )
  // Provider for API service mTLS certificate
  .addProvider(
    'ApiTlsProvider',
    new TlsSecretProvider({
      name: 'api-tls',
      namespace: config.namespace,
    })
  )
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('IngressTlsProvider')
  // Add TLS certificate for ingress controller
  .addSecret({
    name: 'INGRESS_TLS',
    provider: 'IngressTlsProvider',
  })
  // Add TLS certificate for API service
  .addSecret({
    name: 'API_TLS',
    provider: 'ApiTlsProvider',
  });
