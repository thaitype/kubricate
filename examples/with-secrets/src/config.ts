import { SecretManager } from '@kubricate/core';
import { EnvSecretProvider, ImagePullSecretProvider } from '@kubricate/kubernetes';
import { EnvConnector } from '@kubricate/env';

export const config = {
  namespace: 'my-namespace',
};

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
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
  .setDefaultConnector('EnvConnector')
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
