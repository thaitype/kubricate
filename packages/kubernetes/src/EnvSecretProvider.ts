import type { AnyClass, BaseLogger, SecretInjectionStrategy, ProviderInjection } from '@kubricate/core';
import type { BaseProvider, PreparedEffect } from '@kubricate/core';
import { Base64 } from 'js-base64';
import { createKubernetesMergeHandler } from './merge-utils.js';

export interface WithStackIdentifier {
  /**
   * The stack identifier is used to identify the stack that the secret is injected into.
   * It is used to find the correct stack in the stack manager.
   *
   * @future apply with string | symbol for stack identifier for advanced usage
   */
  stackIdentifier: AnyClass;
}

export interface EnvSecretProviderConfig {
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
import ProviderInjection from '@kubricate/core';
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

type SupportedStrategies = 'env';

/**
 * EnvSecretProvider is a provider that uses Kubernetes secrets to inject secrets into the application.
 * It uses the Kubernetes API to create a secret with the given name and value.
 * The secret is created in the specified namespace.
 *
 * @see https://kubernetes.io/docs/concepts/configuration/secret/
 */
export class EnvSecretProvider implements BaseProvider<EnvSecretProviderConfig, SupportedStrategies> {

  name: string | undefined;
  logger?: BaseLogger;
  readonly targetKind = 'Deployment';
  readonly supportedStrategies: SupportedStrategies[] = ['env'];

  constructor(public config: EnvSecretProviderConfig) { }

  getTargetPath(strategy: SecretInjectionStrategy): string {
    if (strategy.kind === 'env') {
      const index = strategy.containerIndex ?? 0;
      return `spec.template.spec.containers[${index}].env`;
    }

    throw new Error(`[EnvSecretProvider] Unsupported injection strategy: ${strategy.kind}`);
  }

  getEffectIdentifier(effect: PreparedEffect): string {
    const meta = effect.value?.metadata ?? {};
    return `${meta.namespace ?? 'default'}/${meta.name}`;
  }

  getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] {
    return injectes.map((inject) => {
      const name = inject.meta?.targetName ?? inject.meta?.secretName;
      const key = inject.meta?.secretName;

      if (!name || !key) {
        throw new Error('[EnvSecretProvider] Invalid injection metadata: name or key is missing.');
      }

      return {
        name,
        valueFrom: {
          secretKeyRef: {
            name: this.config.name,
            key,
          },
        },
      };
    });
  }


  /**
   * Merge provider-level effects into final applyable resources.
   * Used to deduplicate (e.g. K8s secret name + ns).
   */
  mergeSecrets(effects: PreparedEffect[]): PreparedEffect[] {
    const merge = createKubernetesMergeHandler();
    return merge(effects);
  }

  prepare(name: string, value: string): PreparedEffect[] {
    const encoded = Base64.encode(value);
    return [
      {
        providerName: this.name,
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


