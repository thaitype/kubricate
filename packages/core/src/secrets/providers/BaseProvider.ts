import type { SecretInjectionStrategy } from '../../BaseStack.js';
import type { BaseLogger } from '../../types.js';
import type { SecretValue } from '../types.js';

export interface BaseProvider<
  Config extends object = object,
  SupportedStrategies extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind'],
> {
  config: Config;

  logger?: BaseLogger;

  /**
   * Prepares the secret for the given name and value.
   * This method should return a resource object that can be applied to Kubernetes.
   */
  prepare(name: string, value: SecretValue): PreparedEffect[];

  /**
   * Returns the payload to be injected into the target resource.
   *
   * getInjectionPayload, will be called multiple times, sometime may no secrets set, this will be happen when read config from `kubricate.config` file
   * However, when the `kubricate generate` command is executed, the secrets will be set.
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
}

export type PreparedEffect = ManualEffect | KubectlEffect;

export interface BaseEffect<Type extends string, T = unknown> {
  type: Type;
  value: T;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ManualEffect extends BaseEffect<'manual'> { }

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
