import type { SecretInjectionStrategy } from '../../BaseStack.js';
import type { BaseLogger } from '../../types.js';
import type { SecretValue } from '../types.js';

export interface BaseProvider<
  Config extends object = object,
  SupportedStrategies extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind'],
> {
  /**
   * The name of the provider.
   * This is used to identify the provider in the config and logs.
   */
  name: string | undefined;
  config: Config;

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

  readonly supportedStrategies: SupportedStrategies[];

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
   */
  readonly secretType?: string;

  /**
   * Whether this provider allows merging (default = false)
   */
  readonly allowMerge?: boolean;
}

export type PreparedEffect = CustomEffect | KubectlEffect;

export interface BaseEffect<Type extends string, T = unknown> {
  type: Type;
  value: T;
  
  // Metadata for the effect, refactor later
  providerName: string | undefined;
  secretName?: string; // Use for diagnostics
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
export interface CustomEffect<T extends object = any> extends BaseEffect<'custom', T> { }

/**
 * KubectlEffect is used to apply a value to a resource using kubectl.
 * This will apply automatically to the resource when it is created.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export interface KubectlEffect<T extends object = any> extends BaseEffect<'kubectl', T> { }

export interface ProviderInjection<ResourceId extends string = string, Path extends string = string> {
  /**
   * A stable identifier for the provider instance.
   */
  providerId: string;

  /**
   * Provider Instance use for get injectionPayload
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
  };
}
