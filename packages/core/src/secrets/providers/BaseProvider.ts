import type { BaseLogger } from '../../types.js';
import type { SecretOptions } from '../SecretManager.js';
import type { SecretValue } from '../types.js';

export interface BaseProvider<Config extends object = object> {
  config: Config;
  /**
   * Secret from SecretManager (This only metadata and not the value)
   * This is used to inject the secret into the resource.
   */
  secrets: Record<string, SecretOptions> | undefined;
  injectes: ProviderInjection[];
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
  getInjectionPayload(): unknown;

  /**
   * @interal Sets the secrets in the provider.
   * This will be called by secretOrchestrator during `kubricate generate`
   *
   * @param secrets The secrets to be set in the provider.
   */
  setSecrets(secrets: Record<string, SecretOptions>): void;

  /**
   * @internal Sets the injects in the provider.
   *
   * @param injectes
   */
  setInjects(injectes: ProviderInjection[]): void;
}

export type PreparedEffect = ManualEffect | KubricateEffect | KubectlEffect;

export interface BaseEffect<Type extends string, T = unknown> {
  type: Type;
  value: T;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ManualEffect extends BaseEffect<'manual'> {}
/**
 * KubricateEffect is used to apply a value to a resource using Kubricate.
 * This will apply automatically to the resource when it is created.
 */
export interface KubricateEffect extends BaseEffect<'kubricate'> {
  /**
   * ID of the resource as defined in KubricateComposer.
   * Example: `deployment`, `service`, `secret-mykey`
   */
  resourceId: string;
  /**
   * Dot path inside the resource to apply this value to.
   * Example: 'spec.template.metadata.annotations'
   *
   * This is used to deep-merge the value into the resource.
   * Refer to lodash get (Gets the value at path of object.) for more details.
   * https://lodash.com/docs/4.17.15#get
   *
   * This is a dot-separated path to the property in the resource where the value should be applied.
   *
   * @default '' means the value will be applied to the root of the resource.
   */
  path?: string;
}
/**
 * KubectlEffect is used to apply a value to a resource using kubectl.
 * This will apply automatically to the resource when it is created.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export interface KubectlEffect<T extends object = any> extends BaseEffect<'kubectl', T> {}

export interface ProviderInjection<ResourceId extends string = string, Path extends string = string> {
  resourceId: ResourceId;
  path: Path;
}
