import { SecretManager, KubernetesSecretProvider } from '@kubricate/core';

export const config = {
  namespace: 'my-namespace',
};

export const secretManager = new SecretManager()
  .addProvider(
    'Kubernetes.Secret',
    new KubernetesSecretProvider({
      name: 'secret-application',
    })
  )
  .addSecret({
    provider: 'Kubernetes.Secret',
    name: 'my_app_key',
  });
