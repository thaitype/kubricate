export interface BaseProvider<Config extends object = object> {
  config: Config;

  /**
   * Prepares the secret for the given name and value.
   * This method should return a manifest object that can be applied to Kubernetes.
   */
  prepare(name: string, value: string): PreparedEffect[];
}

export interface PreparedEffect {
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

  /**
   * Value to deep-merge into the specified path
   */
  value: unknown;
}
