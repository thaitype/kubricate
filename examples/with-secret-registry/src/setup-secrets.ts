import { EnvConnector } from '@kubricate/plugin-env';
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager, SecretRegistry } from 'kubricate';

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
  });

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
  });

export const secretRegistry = new SecretRegistry()
  .add('frontend', frontendSecretManager)
  .add('backend', backendSecretManager);
