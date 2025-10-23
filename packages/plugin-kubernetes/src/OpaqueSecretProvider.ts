import { Base64 } from 'js-base64';

import type {
  BaseLogger,
  BaseProvider,
  PreparedEffect,
  ProviderInjection,
  SecretInjectionStrategy,
} from '@kubricate/core';

import type { EnvVar } from './kubernetes-types.js';
import { createKubernetesMergeHandler } from './merge-utils.js';

export interface OpaqueSecretProviderConfig {
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

type SupportedStrategies = 'env';

/**
 * OpaqueSecretProvider is a provider that uses Kubernetes secrets to inject secrets into the application.
 * It uses the Kubernetes API to create a secret with the given name and value.
 * The secret is created in the specified namespace.
 *
 * @see https://kubernetes.io/docs/concepts/configuration/secret/
 */
export class OpaqueSecretProvider implements BaseProvider<OpaqueSecretProviderConfig, SupportedStrategies> {
  readonly allowMerge = true;
  readonly secretType = 'Kubernetes.Secret.Opaque';

  name: string | undefined;
  logger?: BaseLogger;
  readonly targetKind = 'Deployment';
  readonly supportedStrategies: SupportedStrategies[] = ['env'];

  constructor(public config: OpaqueSecretProviderConfig) {}

  getTargetPath(strategy: SecretInjectionStrategy): string {
    if (strategy.kind === 'env') {
      if (strategy.targetPath) {
        return strategy.targetPath;
      }
      const index = strategy.containerIndex ?? 0;
      return `spec.template.spec.containers[${index}].env`;
    }

    throw new Error(`[OpaqueSecretProvider] Unsupported injection strategy: ${strategy.kind}`);
  }

  getEffectIdentifier(effect: PreparedEffect): string {
    const meta = effect.value?.metadata ?? {};
    return `${meta.namespace ?? 'default'}/${meta.name}`;
  }

  getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] {
    return injectes.map(inject => {
      const name = inject.meta?.targetName ?? inject.meta?.secretName;
      const key = inject.meta?.secretName;

      if (!name || !key) {
        throw new Error('[OpaqueSecretProvider] Invalid injection metadata: name or key is missing.');
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
        secretName: name,
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
