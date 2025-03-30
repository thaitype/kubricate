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
      // TODO: namespace: config.namespace,
      // TODO: isInjected: true, If true the framework will into injected into the container env;
    })
  )
  .setDefaultLoader('EnvLoader')
  .setDefaultProvider('Kubernetes.Secret')
  .addSecret('my_app_key');
