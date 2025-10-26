// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClass = new (...args: any[]) => any;
interface TypeMeta {
  apiVersion: string;
  kind: string;
}
type WithTypeMeta<T> = T extends Omit<infer U, keyof TypeMeta> ? U : T;
/**
 * Converts a Kubernetes model class (from `kubernetes-models` package)
 * into a plain JSON-compatible object.
 *
 * This function instantiates the given Kubernetes model class with the provided config,
 * uses `.toJSON()` to extract the raw object representation, and then deep-clones
 * it into a plain object. This removes class methods and prototype chains,
 * making the object ready for serialization, diffing, or further transformation.
 *
 * ⚠️ This is designed specifically for use with `kubernetes-models` package.
 * It requires the class instance to implement `.toJSON()` method.
 *
 * @template T - A Kubernetes model class constructor
 * @param type - The constructor of a Kubernetes model (e.g. `Deployment`, `Service`)
 * @param config - The configuration object for the model constructor
 * @returns A deep-cloned plain object representing the Kubernetes resource
 *
 * @throws {Error} If the created instance does not implement `.toJSON()`
 *
 * @example
 * ```ts
 * import { Deployment } from 'kubernetes-models/apps/v1';
 * import { kubeModel } from '@kubricate/kubernetes-models';
 *
 * const deployment = kubeModel(Deployment, {
 *   metadata: { name: 'nginx' },
 *   spec: { replicas: 2, template: { ... } }
 * });
 * ```
 */
export function kubeModel<T extends AnyClass>(
  type: T,
  config: ConstructorParameters<T>[0]
): NonNullable<WithTypeMeta<ConstructorParameters<T>[0]>> {
  const instance = new type(config);

  if (typeof instance.toJSON !== 'function') {
    throw new Error(
      `[kubeModel] ${type.name} does not implement .toJSON(). This function only supports kubernetes-models.`
    );
  }

  if (typeof instance.validate === 'function') {
    instance.validate();
  }

  return structuredClone(instance.toJSON());
}
