import type { BaseLogger } from '../../types.js';

export interface BaseProvider<Config extends object = object> {
  config: Config;

  logger?: BaseLogger;

  /**
   * Prepares the secret for the given name and value.
   * This method should return a manifest object that can be applied to Kubernetes.
   */
  prepare(name: string, value: string): PreparedEffect[];
}

export type PreparedEffect = ManualEffect | KubricateEffect | KubectlEffect;

export interface BaseEffect<Type extends string, T = unknown> {
  type: Type;
  value: T;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ManualEffect extends BaseEffect<'manual'> {}
/**
 * KubricateEffect is used to apply a value to a manifest using Kubricate.
 * This will apply automatically to the manifest when it is created.
 */
export interface KubricateEffect extends BaseEffect<'kubricate'> {
  /**
   * ID of the resource as defined in KubricateComposer.
   * Example: `deployment`, `service`, `secret-mykey`
   */
  composerId: string;
  /**
   * Dot path inside the manifest to apply this value to.
   * Example: 'spec.template.metadata.annotations'
   *
   * This is used to deep-merge the value into the manifest.
   * Refer to lodash get (Gets the value at path of object.) for more details.
   * https://lodash.com/docs/4.17.15#get
   *
   * This is a dot-separated path to the property in the manifest where the value should be applied.
   *
   * @default '' means the value will be applied to the root of the manifest.
   */
  path?: string;
}
/**
 * KubectlEffect is used to apply a value to a manifest using kubectl.
 * This will apply automatically to the manifest when it is created.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export interface KubectlEffect<T extends object = any> extends BaseEffect<'kubectl', T> {}
