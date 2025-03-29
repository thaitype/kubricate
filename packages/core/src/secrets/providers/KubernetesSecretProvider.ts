import type { BaseProvider } from './BaseProvider.js';

export type KubernetesSecretConfig = {
  /**
   * The name of the secret to use.
   */
  name: string;
};

export class KubernetesSecretProvider implements BaseProvider<KubernetesSecretConfig> {
  constructor(public config: KubernetesSecretConfig) {}
}
