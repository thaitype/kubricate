import { Base64 } from 'js-base64';

import type {
  BaseLogger,
  BaseProvider,
  PreparedEffect,
  ProviderInjection,
  SecretInjectionStrategy,
} from '@kubricate/core';

import type { EnvFromSource } from './BasicAuthSecretProvider.js';
import type { EnvVar } from './kubernetes-types.js';
import { createKubernetesMergeHandler } from './merge-utils.js';

export interface CustomTypeSecretProviderConfig {
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
  /**
   * The custom secret type (e.g., 'vendor.com/custom', 'my.company/api-token').
   * Can be any valid Kubernetes Secret type including 'Opaque'.
   */
  secretType: string;
  /**
   * Optional list of allowed keys. If specified, only these keys will be accepted
   * in the prepare() method. This provides type-safety and validation for dynamic keys.
   */
  allowedKeys?: readonly string[];
}

type SupportedStrategies = 'env' | 'envFrom';

/**
 * CustomTypeSecretProvider is a flexible provider for creating Kubernetes Secrets
 * with user-defined types (non-Opaque or custom types).
 *
 * This provider acts as a lightweight, extensible solution for teams that need to
 * define custom secret types without writing a full bespoke provider.
 *
 * It supports both individual key injection (env) and bulk injection (envFrom).
 *
 * @example
 * ```ts
 * const provider = new CustomTypeSecretProvider({
 *   name: 'api-token-secret',
 *   namespace: 'production',
 *   secretType: 'vendor.com/custom',
 *   allowedKeys: ['api_key', 'endpoint'], // optional
 * });
 *
 * // Create the Secret
 * const effects = provider.prepare('API_TOKEN', {
 *   api_key: 'abcd-1234',
 *   endpoint: 'https://vendor.example.com',
 * });
 * ```
 *
 * @see https://kubernetes.io/docs/concepts/configuration/secret/
 */
export class CustomTypeSecretProvider implements BaseProvider<CustomTypeSecretProviderConfig, SupportedStrategies> {
  readonly allowMerge = true;
  readonly secretType = 'Kubernetes.Secret.CustomType';

  name: string | undefined;
  logger?: BaseLogger;
  readonly targetKind = 'Deployment';
  readonly supportedStrategies: SupportedStrategies[] = ['env', 'envFrom'];

  constructor(public config: CustomTypeSecretProviderConfig) {
    // Validate secretType is not empty
    if (!config.secretType || config.secretType.trim().length === 0) {
      throw new Error('[CustomTypeSecretProvider] secretType cannot be empty');
    }
  }

  getTargetPath(strategy: SecretInjectionStrategy): string {
    if (strategy.kind === 'env') {
      if (strategy.targetPath) {
        return strategy.targetPath;
      }
      const index = strategy.containerIndex ?? 0;
      return `spec.template.spec.containers[${index}].env`;
    }

    if (strategy.kind === 'envFrom') {
      if (strategy.targetPath) {
        return strategy.targetPath;
      }
      const index = strategy.containerIndex ?? 0;
      return `spec.template.spec.containers[${index}].envFrom`;
    }

    throw new Error(`[CustomTypeSecretProvider] Unsupported injection strategy: ${strategy.kind}`);
  }

  getEffectIdentifier(effect: PreparedEffect): string {
    const meta = effect.value?.metadata ?? {};
    return `${meta.namespace ?? 'default'}/${meta.name}`;
  }

  /**
   * Get injection payload for Kubernetes manifests.
   *
   * This method routes to the appropriate handler based on the injection strategy kind.
   * All injections in the array MUST use the same strategy kind (homogeneity requirement).
   *
   * @param injectes Array of provider injections. Must all use the same strategy kind.
   * @returns Array of environment variables (for 'env' strategy) or envFrom sources (for 'envFrom' strategy)
   *
   * @throws {Error} If mixed injection strategies are detected (e.g., both 'env' and 'envFrom')
   * @throws {Error} If multiple envFrom prefixes are detected for the same provider
   * @throws {Error} If an unsupported strategy kind is encountered
   *
   * @example
   * // Valid: All env strategy
   * const envPayload = provider.getInjectionPayload([
   *   { meta: { strategy: { kind: 'env', key: 'api_key' } } },
   *   { meta: { strategy: { kind: 'env', key: 'endpoint' } } }
   * ]);
   *
   * @example
   * // Valid: All envFrom with same prefix
   * const envFromPayload = provider.getInjectionPayload([
   *   { meta: { strategy: { kind: 'envFrom', prefix: 'VENDOR_' } } },
   *   { meta: { strategy: { kind: 'envFrom', prefix: 'VENDOR_' } } }
   * ]);
   *
   * @example
   * // Invalid: Mixed strategies (throws error)
   * provider.getInjectionPayload([
   *   { meta: { strategy: { kind: 'env' } } },
   *   { meta: { strategy: { kind: 'envFrom' } } }
   * ]); // Throws error
   */
  getInjectionPayload(injectes: ProviderInjection[]): EnvVar[] | EnvFromSource[] {
    if (injectes.length === 0) {
      return [];
    }

    // VALIDATION: Ensure all injections use the same strategy kind
    const firstStrategy = this.extractStrategy(injectes[0]);
    const mixedStrategies = injectes.filter(inject => {
      const strategy = this.extractStrategy(inject);
      return strategy.kind !== firstStrategy.kind;
    });

    if (mixedStrategies.length > 0) {
      const kinds = injectes.map(i => this.extractStrategy(i).kind);
      const uniqueKinds = [...new Set(kinds)].join(', ');
      throw new Error(
        `[CustomTypeSecretProvider] Mixed injection strategies are not allowed. ` +
          `Expected all injections to use '${firstStrategy.kind}' but found: ${uniqueKinds}. ` +
          `This is likely a framework bug or incorrect targetPath configuration.`
      );
    }

    if (firstStrategy.kind === 'env') {
      return this.getEnvInjectionPayload(injectes);
    }

    if (firstStrategy.kind === 'envFrom') {
      return this.getEnvFromInjectionPayload(injectes);
    }

    throw new Error(`[CustomTypeSecretProvider] Unsupported strategy kind: ${firstStrategy.kind}`);
  }

  private extractStrategy(inject: ProviderInjection): SecretInjectionStrategy {
    // Extract strategy from meta if available
    const strategy = inject.meta?.strategy;
    if (strategy) {
      return strategy;
    }

    // Fallback: infer from path
    const path = inject.path;
    if (path.includes('.envFrom')) {
      return { kind: 'envFrom' };
    }
    return { kind: 'env' };
  }

  private getEnvInjectionPayload(injectes: ProviderInjection[]): EnvVar[] {
    return injectes.map(inject => {
      const name = inject.meta?.targetName ?? inject.meta?.secretName;
      const strategy = this.extractStrategy(inject);

      if (!name) {
        throw new Error('[CustomTypeSecretProvider] Missing targetName (.forName) for env injection.');
      }

      // Extract key from strategy
      const key = strategy.kind === 'env' ? strategy.key : undefined;

      if (!key) {
        throw new Error(`[CustomTypeSecretProvider] 'key' is required for env injection.`);
      }

      // VALIDATION: Check if key is in allowedKeys (if configured)
      if (this.config.allowedKeys && this.config.allowedKeys.length > 0) {
        const allowedKeysSet = new Set(this.config.allowedKeys);
        if (!allowedKeysSet.has(key)) {
          throw new Error(
            `[CustomTypeSecretProvider] Key '${key}' is not allowed. ` +
              `Allowed keys are: ${this.config.allowedKeys.join(', ')}.`
          );
        }
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

  private getEnvFromInjectionPayload(injectes: ProviderInjection[]): EnvFromSource[] {
    // VALIDATION: Ensure all injections use envFrom strategy
    const invalidInjections = injectes.filter(inject => {
      const strategy = this.extractStrategy(inject);
      return strategy.kind !== 'envFrom';
    });

    if (invalidInjections.length > 0) {
      throw new Error(
        `[CustomTypeSecretProvider] Mixed injection strategies detected in envFrom handler. ` +
          `All injections must use 'envFrom' strategy. ` +
          `Found ${invalidInjections.length} injection(s) with different strategy.`
      );
    }

    // VALIDATION: Check for conflicting prefixes
    const prefixes = new Set<string | undefined>();
    injectes.forEach(inject => {
      const strategy = this.extractStrategy(inject);
      if (strategy.kind === 'envFrom') {
        prefixes.add(strategy.prefix);
      }
    });

    if (prefixes.size > 1) {
      const prefixList = Array.from(prefixes)
        .map(p => p || '(none)')
        .join(', ');
      throw new Error(
        `[CustomTypeSecretProvider] Multiple envFrom prefixes detected: ${prefixList}. ` +
          `All envFrom injections for the same secret must use the same prefix.`
      );
    }

    const firstStrategy = this.extractStrategy(injectes[0]);
    const prefix = firstStrategy.kind === 'envFrom' ? firstStrategy.prefix : undefined;

    return [
      {
        ...(prefix && { prefix }),
        secretRef: {
          name: this.config.name,
        },
      },
    ];
  }

  /**
   * Merge provider-level effects into final applyable resources.
   * Used to deduplicate (e.g. K8s secret name + ns).
   */
  mergeSecrets(effects: PreparedEffect[]): PreparedEffect[] {
    const merge = createKubernetesMergeHandler();
    return merge(effects);
  }

  /**
   * Prepare a Kubernetes Secret with custom type and dynamic key/value pairs.
   *
   * @param name The secret name identifier
   * @param value A record of key/value pairs to be base64-encoded in the Secret data
   * @returns Array containing the prepared Secret effect
   *
   * @throws {Error} If allowedKeys is configured and provided keys are not in the allowed list
   */
  prepare(name: string, value: Record<string, string>): PreparedEffect[] {
    // VALIDATION: Check allowedKeys if configured
    if (this.config.allowedKeys && this.config.allowedKeys.length > 0) {
      const providedKeys = Object.keys(value);
      const allowedKeysSet = new Set(this.config.allowedKeys);

      const invalidKeys = providedKeys.filter(key => !allowedKeysSet.has(key));

      if (invalidKeys.length > 0) {
        throw new Error(
          `[CustomTypeSecretProvider] Invalid keys provided: ${invalidKeys.join(', ')}. ` +
            `Allowed keys are: ${this.config.allowedKeys.join(', ')}.`
        );
      }
    }

    // Encode all values to base64
    const data: Record<string, string> = {};
    for (const [key, val] of Object.entries(value)) {
      data[key] = Base64.encode(val);
    }

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
          type: this.config.secretType,
          data,
        },
      },
    ];
  }
}
