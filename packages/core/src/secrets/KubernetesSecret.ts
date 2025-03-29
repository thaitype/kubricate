import type { ProviderBase } from './types.js';

export type KubernetesSecretConfig = {
  /**
   * The name of the secret to use.
   */
  name: string;
};

export type KubernetesSecretProvider = ProviderBase<'Kubernetes.Secret', KubernetesSecretConfig>;
