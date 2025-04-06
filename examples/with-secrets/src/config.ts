import { SecretManager } from '@kubricate/core';
import { EnvSecretProvider } from '@kubricate/kubernetes';
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
    'EnvSecretProvider_tmp',
    new EnvSecretProvider({
      name: 'secret-application',
    })
  )
  .setDefaultLoader('EnvLoader')
  .setDefaultProvider('EnvSecretProvider_tmp')
  .addSecret({
    name: 'my_app_key',
    // provider: 'EnvSecretProvider'
  });
