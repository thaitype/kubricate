import { SecretManager } from 'kubricate';

import { EnvConnector } from '@kubricate/plugin-env';
import { OpaqueSecretProvider, DockerConfigSecretProvider } from '@kubricate/plugin-kubernetes';

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider(
    'OpaqueSecretProvider',
    new OpaqueSecretProvider({
      name: 'secret-application',
    })
  )
  .addProvider(
    'DockerConfigSecretProvider',
    new DockerConfigSecretProvider({
      name: 'secret-application-provider',
    })
  )
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({
    name: 'my_app_key',
  })
  .addSecret({
    name: 'my_app_key_2',
  })
  .addSecret({
    name: 'DOCKER_SECRET',
    provider: 'DockerConfigSecretProvider',
  });
