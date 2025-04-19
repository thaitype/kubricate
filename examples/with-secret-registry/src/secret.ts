import { SecretManager, SecretRegistry } from '@kubricate/core';
import { OpaqueSecretProvider } from '@kubricate/kubernetes';
import { EnvConnector } from '@kubricate/env';

const frontendSecretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider(
    'OpaqueSecretProvider',
    new OpaqueSecretProvider({
      name: 'secret-frontend',
    })
  )
  .addSecret({
    name: 'frontend_app_key',
  })

const backendSecretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider(
    'OpaqueSecretProvider',
    new OpaqueSecretProvider({
      name: 'secret-backend',
    })
  )
  .addSecret({
    name: 'backend_app_key',
  })

export const secretRegistry = new SecretRegistry()
  .register('frontend', frontendSecretManager)
  .register('backend', backendSecretManager);
