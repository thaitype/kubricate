import type { SecretOptions } from '../SecretManager.js';
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

/**
 * EnvVar represents an environment variable present in a Container.
 *
 * Ported from import { IEnvVar } from 'kubernetes-models/v1/EnvVar';
 */
export interface EnvVar {
  /**
   * Name of the environment variable. Must be a C_IDENTIFIER.
   */
  name: string;
  /**
   * Variable references $(VAR_NAME) are expanded using the previously defined environment variables in the container and any service environment variables. If a variable cannot be resolved, the reference in the input string will be unchanged. Double $$ are reduced to a single $, which allows for escaping the $(VAR_NAME) syntax: i.e. "$$(VAR_NAME)" will produce the string literal "$(VAR_NAME)". Escaped references will never be expanded, regardless of whether the variable exists or not. Defaults to "".
   */
  value?: string;
  /**
   * Source for the environment variable's value. Cannot be used if value is not empty.
   */
  valueFrom?: {
    /**
     * Selects a key of a secret in the pod's namespace
     */
    secretKeyRef?: {
      /**
       * The key of the secret to select from.  Must be a valid secret key.
       */
      key: string;
      /**
       * Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names
       */
      name?: string;
      /**
       * Specify whether the Secret or its key must be defined
       */
      optional?: boolean;
    };
  };
}

export class KubernetesSecretProvider implements BaseProvider<KubernetesSecretProviderConfig> {
  secrets: Record<string, SecretOptions> = {};

  constructor(public config: KubernetesSecretProviderConfig) {}

  setSecrets(secrets: Record<string, SecretOptions>): void {
    this.secrets = secrets;
  }

  getInjectionPayload(): EnvVar[] {
    if (!this.secrets || Object.keys(this.secrets).length === 0) {
      throw new Error(`Secrets not set for KubernetesSecretProvider`);
    }

    return Object.entries(this.secrets).map(([name]) => ({
      name,
      valueFrom: {
        secretKeyRef: {
          name: this.config.name,
          key: name,
        },
      },
    }));
  }

  prepare(name: string, value: string): PreparedEffect[] {
    const encoded = Base64.encode(value);
    return [
      {
        type: 'kubectl',
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
