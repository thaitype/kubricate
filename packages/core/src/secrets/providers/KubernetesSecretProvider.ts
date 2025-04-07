import type { AnyClass, BaseLogger } from '../../types.js';
import type { SecretOptions } from '../SecretManager.js';
import type { BaseProvider, PreparedEffect } from './BaseProvider.js';
import { Base64 } from 'js-base64';

export interface WithStackIdentifier {
  /**
   * The stack identifier is used to identify the stack that the secret is injected into.
   * It is used to find the correct stack in the stack manager.
   *
   * @future apply with string | symbol for stack identifier for advanced usage
   */
  stackIdentifier: AnyClass;
}

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

  // TODO: add support for targetInjects
  // targetInjects?: (ProviderSecretsInjection & WithStackIdentifier)[];
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

/**
 * KubernetesSecretProvider is a provider that uses Kubernetes secrets to inject secrets into the application.
 * It uses the Kubernetes API to create a secret with the given name and value.
 * The secret is created in the specified namespace.
 *
 * @see https://kubernetes.io/docs/concepts/configuration/secret/
 * @deprecated This provider is deprecated and will be removed in the future. Migrated to `EnvSecretProvider` from `@kubernetes/kubernetes`.
 */

export class KubernetesSecretProvider implements BaseProvider<KubernetesSecretProviderConfig> {
  secrets: Record<string, SecretOptions> | undefined;
  logger?: BaseLogger;
  readonly supportedStrategies: 'custom'[] = ['custom'];

  constructor(public config: KubernetesSecretProviderConfig) {}

  setSecrets(secrets: Record<string, SecretOptions>): void {
    this.secrets = secrets;
  }

  getTargetPath(): string {
    throw new Error('The deprecated KubernetesSecretProvider does not support target path');
  }

  getInjectionPayload(): EnvVar[] {
    if (!this.secrets) {
      throw new Error('Secrets not set in KubernetesSecretProvider');
    }
    if (Object.keys(this.secrets).length === 0) {
      this.logger?.warn('Trying to get secrets from KubernetesSecretProvider, but no secrets set');
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
