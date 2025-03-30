import type { BaseProvider, PreparedEffect } from './BaseProvider.js';
import { Base64 } from 'js-base64';

export interface KubernetesSecretProviderConfig {
  /**
   * The name of the secret to use.
   */
  name: string;
  /**
   * The namespace of the secret to use.
   *
   * @default 'default'
   */
  namespace?: string;
}

export class KubernetesSecretProvider implements BaseProvider<KubernetesSecretProviderConfig> {
  constructor(public config: KubernetesSecretProviderConfig) {}

  prepare(name: string, value: string): PreparedEffect[] {
    const encoded = Base64.encode(value);
    return [
      {
        composerId: `secret-${name}`, // Composer ID used in `addObject` or `addClass`
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: this.config.name,
            namespace: this.config.namespace ?? 'default',
          },
          type: 'Opaque',
          data: {
            [name]: encoded,
          },
        },
      },
    ];
  }
}
