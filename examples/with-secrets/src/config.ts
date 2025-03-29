import { SecretManager, KubernetesSecretProvider } from '@kubricate/core';
import { EnvLoader } from '@kubricate/env';

export const config = {
  namespace: 'my-namespace',
};

export const secretManager = new SecretManager()
  .addLoader('EnvLoader', new EnvLoader())
  .addProvider(
    'Kubernetes.Secret',
    new KubernetesSecretProvider({
      name: 'secret-application',
    })
  )
  .setDefaultLoader('EnvLoader')
  .setDefaultProvider('Kubernetes.Secret')
  .addSecret({
    name: 'my_app_key',
  });
