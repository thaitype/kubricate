import { SecretManager } from '@kubricate/core';
import { OpaqueSecretProvider, DockerConfigSecretProvider } from '@kubricate/kubernetes';
import { EnvConnector } from '@kubricate/plugin-env';

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
  })
