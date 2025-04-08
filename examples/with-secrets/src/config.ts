import { SecretManager } from '@kubricate/core';
import { EnvSecretProvider, ImagePullSecretProvider } from '@kubricate/kubernetes';
import { EnvLoader } from '@kubricate/env';

export const config = {
  namespace: 'my-namespace',
};

export const secretManager = new SecretManager()
  .addLoader('EnvLoader', new EnvLoader())
  .addProvider(
    'EnvSecretProvider',
    new EnvSecretProvider({
      name: 'secret-application',
    })
  )
  .addProvider(
    'ImagePullSecretProvider',
    new ImagePullSecretProvider({
      name: 'secret-application-provider',
    })
  )
  .setDefaultLoader('EnvLoader')
  .setDefaultProvider('EnvSecretProvider')
  .addSecret({
    name: 'my_app_key',
  })
  .addSecret({
    name: 'my_app_key_2',
  })
  .addSecret({
    name: 'DOCKER_SECRET',
    provider: 'ImagePullSecretProvider',
  })
