import type { BaseProvider } from './BaseProvider.js';

export interface KubernetesSecretProviderConfig {
  /**
   * The name of the secret to use.
   */
  name: string;
}

export class KubernetesSecretProvider implements BaseProvider<KubernetesSecretProviderConfig> {
  constructor(public config: KubernetesSecretProviderConfig) {}
}
