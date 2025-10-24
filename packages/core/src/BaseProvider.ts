import type { BaseLogger } from './logger.js';
import type { SecretInjectionStrategy, SecretValue } from './types.js';

/**
 * Base interface for secret providers that convert secret values into Kubernetes resources
 * or inject them into existing resources.
 *
 * @template Config - Configuration object type for the provider
 * @template SupportedStrategies - Union of injection strategy kinds this provider supports (e.g., 'env', 'imagePullSecret')
 * @template SupportedEnvKeys - Union of environment key names this provider supports
 *
 * @example
 * ```typescript
 * class OpaqueSecretProvider implements BaseProvider<
 *   OpaqueSecretConfig,
 *   'env' | 'volume',
 *   'username' | 'password'
 * > {
 *   // ... implementation
 * }
 * ```
 */
export interface BaseProvider<
  Config extends object = object,
  SupportedStrategies extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind'],
  SupportedEnvKeys extends string = string,
> {
  /**
   * The name of the provider.
   * This is used to identify the provider in the config and logs.
   */
  name: string | undefined;

  /**
   * Configuration object for the provider.
   * Contains provider-specific settings like namespace, labels, etc.
   */
  config: Config;

  /**
   * Optional logger instance for provider operations.
   * Used for debugging and diagnostic output.
   */
  logger?: BaseLogger;

  /**
   * prepare() is used to provision secret values into the cluster or remote backend.
   * It is only called during `kubricate secret apply`.
   *
   * It should return the full secret resource (e.g., Kubernetes Secret, Vault payload).
   */
  prepare(name: string, value: SecretValue): PreparedEffect[];

  /**
   * getInjectionPayload() is used to return runtime resource values (e.g., container.env).
   * This is used during manifest generation (`kubricate generate`) and must be pure.
   */
  getInjectionPayload(injectes: ProviderInjection[]): unknown;

  /**
   * Return the Kubernetes path this provider expects for a given strategy.
   * This is used to generate the target path in the manifest for injection.
   */
  getTargetPath(strategy: SecretInjectionStrategy): string;
  /**
   * Kubernetes resource kind this provider expects for a given strategy.
   *
   * e.g. `Deployment`, `StatefulSet`, `DaemonSet`, etc.
   */
  readonly targetKind: string;

  /**
   * List of injection strategy kinds supported by this provider.
   * Must match the SupportedStrategies type parameter.
   *
   * @example ['env', 'volume']
   */
  readonly supportedStrategies: SupportedStrategies[];

  /**
   * Optional list of keys available for the 'env' injection strategy.
   * These keys define what fields can be injected when using the 'env' strategy kind.
   * For example, a BasicAuthSecretProvider might support 'username' and 'password' keys.
   *
   * @example ['username', 'password']
   */
  readonly supportedEnvKeys?: SupportedEnvKeys[];

  /**
   * Optional method to merge multiple prepared effects into a single effect.
   * Used when multiple secrets target the same resource and can be combined.
   *
   * @param effects - Array of effects to merge
   * @returns Merged array of effects
   */
  mergeSecrets?(effects: PreparedEffect[]): PreparedEffect[];

  /**
   * Each provider then defines how its own effects are uniquely identified (for conflict detection).
   *
   * Optional method to uniquely identify effects emitted by this provider
   * Used for detecting provider-level conflicts across providers.
   *
   * If undefined, no cross-provider conflict check will be performed.
   */
  getEffectIdentifier?(effect: PreparedEffect): string;

  /**
   * Defines the target resource type (used for grouping/conflict)
   *
   * @deprecated the framework will use Provider Class name instead
   */
  readonly secretType?: string;

  /**
   * Whether this provider allows merging (default = false)
   */
  readonly allowMerge?: boolean;
}

/**
 * Union type of all possible effects that can be prepared by a provider.
 * Effects represent actions to be taken during `kubricate secret apply`.
 */
export type PreparedEffect = CustomEffect | KubectlEffect;

/**
 * Base interface for all provider effects.
 * Effects encapsulate actions that provision secrets into the cluster or backend.
 *
 * @template Type - String literal type identifying the effect type
 * @template T - The value payload type for this effect
 */
export interface BaseEffect<Type extends string, T = unknown> {
  /**
   * Discriminator field identifying the effect type.
   */
  type: Type;

  /**
   * The effect payload/value to be applied.
   */
  value: T;

  /**
   * Name of the provider that created this effect.
   * Used for diagnostics and conflict detection.
   */
  providerName: string | undefined;

  /**
   * Name of the secret this effect is associated with.
   * Used for diagnostics and error reporting.
   */
  secretName?: string;
}

/**
 * Custom effect type for provider-specific actions.
 * Used for effects that don't map directly to kubectl apply.
 *
 * @template T - The custom value payload type
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
export interface CustomEffect<T extends object = any> extends BaseEffect<'custom', T> {}

/**
 * KubectlEffect is used to apply a value to a resource using kubectl.
 * This will apply automatically to the resource when it is created.
 *
 * @template T - The Kubernetes resource object type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export interface KubectlEffect<T extends object = any> extends BaseEffect<'kubectl', T> {}

/**
 * Represents a single secret injection from a provider into a Kubernetes resource.
 * Used during manifest generation to apply secrets at the correct paths.
 *
 * @template ResourceId - Type of the resource identifier
 * @template Path - Type of the target path string
 */
export interface ProviderInjection<ResourceId extends string = string, Path extends string = string> {
  /**
   * A stable identifier for the provider instance.
   */
  providerId: string;

  /**
   * Provider instance used to get injection payload.
   * Must implement getInjectionPayload() method.
   */
  provider: BaseProvider;
  /**
   * Target resource ID in the composer which the secret will be injected.
   */
  resourceId: ResourceId;
  /**
   * Target path in the resource where the secret will be injected.
   * This is used to deep-merge the value into the resource.
   * Refer to lodash get (Gets the value at path of object.) for more details.
   * https://lodash.com/docs/4.17.15#get
   *
   * This is a dot-separated path to the property in the resource where the value should be applied.
   */
  path: Path;

  /**
   * Extra metadata passed during injection.
   */
  meta?: {
    secretName: string;
    targetName: string;
    strategy?: SecretInjectionStrategy;
  };
}
