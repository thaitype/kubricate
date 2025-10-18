import { EnvConnector } from '@kubricate/plugin-env';
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider(
    'OpaqueSecretProvider',
    new OpaqueSecretProvider({
      name: 'secret-application',
    })
  )
  .addSecret({
    name: 'DATABASE_URL',
  })
  .addSecret({
    name: 'MONITORING_TOKEN',
  });
