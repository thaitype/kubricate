import { Base64 } from 'js-base64';
import { z } from 'zod';

import type {
  BaseLogger,
  BaseProvider,
  PreparedEffect,
  ProviderInjection,
  SecretInjectionStrategy,
  SecretValue,
} from '@kubricate/core';

import type { EnvVar } from './kubernetes-types.js';
import { createKubernetesMergeHandler } from './merge-utils.js';
import { parseZodSchema } from './utils.js';

export const basicAuthSecretSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export interface BasicAuthSecretProviderConfig {
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
 * EnvFromSource represents the source of a set of ConfigMaps/Secrets
 */
export interface EnvFromSource {
  /**
   * An optional identifier to prepend to each key in the Secret.
   */
  prefix?: string;
  /**
   * The Secret to select from
   */
  secretRef?: {
    /**
     * Name of the referent.
     */
    name?: string;
    /**
     * Specify whether the Secret must be defined
     */
    optional?: boolean;
  };
}

type SupportedStrategies = 'env' | 'envFrom';
type SupportedEnvKeys = 'username' | 'password';

/**
 * BasicAuthSecretProvider is a provider that uses Kubernetes basic-auth secrets.
 * It supports both individual key injection (env) and bulk injection (envFrom).
 *
 * The kubernetes.io/basic-auth Secret type has fixed keys: username and password.
 *
 * @see https://kubernetes.io/docs/concepts/configuration/secret/#basic-authentication-secret
 */
export class BasicAuthSecretProvider
  implements BaseProvider<BasicAuthSecretProviderConfig, SupportedStrategies, SupportedEnvKeys>
{
  readonly allowMerge = true;
  readonly secretType = 'Kubernetes.Secret.BasicAuth';

  name: string | undefined;
  logger?: BaseLogger;
  readonly targetKind = 'Deployment';
  readonly supportedStrategies: SupportedStrategies[] = ['env', 'envFrom'];
  readonly supportedEnvKeys: SupportedEnvKeys[] = ['username', 'password'];

  constructor(public config: BasicAuthSecretProviderConfig) {}

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

    throw new Error(`[BasicAuthSecretProvider] Unsupported injection strategy: ${strategy.kind}`);
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
   *   { meta: { strategy: { kind: 'env', key: 'username' } } },
   *   { meta: { strategy: { kind: 'env', key: 'password' } } }
   * ]);
   *
   * @example
   * // Valid: All envFrom with same prefix
   * const envFromPayload = provider.getInjectionPayload([
   *   { meta: { strategy: { kind: 'envFrom', prefix: 'DB_' } } },
   *   { meta: { strategy: { kind: 'envFrom', prefix: 'DB_' } } }
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
        `[BasicAuthSecretProvider] Mixed injection strategies are not allowed. ` +
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

    throw new Error(`[BasicAuthSecretProvider] Unsupported strategy kind: ${firstStrategy.kind}`);
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
        throw new Error('[BasicAuthSecretProvider] Missing targetName (.forName) for env injection.');
      }

      // Extract key from strategy
      const key = strategy.kind === 'env' ? strategy.key : undefined;

      if (!key) {
        throw new Error(
          `[BasicAuthSecretProvider] 'key' is required for env injection. Must be 'username' or 'password'.`
        );
      }

      if (key !== 'username' && key !== 'password') {
        throw new Error(`[BasicAuthSecretProvider] Invalid key '${key}'. Must be 'username' or 'password'.`);
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
        `[BasicAuthSecretProvider] Mixed injection strategies detected in envFrom handler. ` +
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
        `[BasicAuthSecretProvider] Multiple envFrom prefixes detected: ${prefixList}. ` +
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

  prepare(name: string, value: SecretValue): PreparedEffect[] {
    const parsedValue = parseZodSchema(basicAuthSecretSchema, value);

    const usernameEncoded = Base64.encode(parsedValue.username);
    const passwordEncoded = Base64.encode(parsedValue.password);

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
          type: 'kubernetes.io/basic-auth',
          data: {
            username: usernameEncoded,
            password: passwordEncoded,
          },
        },
      },
    ];
  }
}
