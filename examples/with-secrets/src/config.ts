import { SecretManager, type KubernetesSecretProvider } from "@kubricate/core";

export const config = {
  namespace: 'my-namespace',
}

export const secretRegistry = new SecretManager<KubernetesSecretProvider>()
  .addProvider('Kubernetes.Secret', {
    name: 'secret-application',
  })
  .addSecret({
    provider: 'Kubernetes.Secret',
    name: 'my_app_key',
  })


