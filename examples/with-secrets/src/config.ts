import { SecretManager, KubernetesSecretProvider } from '@kubricate/core';
import { EnvLoader } from '@kubricate/env';
import { AppStack } from './stacks/AppStack';

export const config = {
  namespace: 'my-namespace',
};

export const secretManager = new SecretManager()
  .addLoader('EnvLoader', new EnvLoader())
  .addProvider(
    'Kubernetes.Secret',
    new KubernetesSecretProvider({
      name: 'secret-application',
      // targetInjects: [
      //   {
      //     resourceId: 'deployment',
      //     stackIdentifier: AppStack,
      //     path: 'spec.template.spec.containers[0].env',
      //   },
      // ],
    })
  )
  .setDefaultLoader('EnvLoader')
  .setDefaultProvider('Kubernetes.Secret')
  .addSecret('my_app_key');
