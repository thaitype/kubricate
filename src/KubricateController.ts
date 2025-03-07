import merge from 'lodash.merge';

export type AnyClass = { new (...args: any[]): any };

export type ResourceStore = Record<
  string,
  {
    type?: AnyClass;
    config: Record<string, unknown>;
  }
>;

export const LABEL_MANAGED_BY_KEY = 'thaitype.dev/managed-by';
export const LABEL_MANAGED_BY_VALUE = 'kubricate';

export class KubricateController<Resource extends Record<string, unknown> = {}> {
  resources: ResourceStore = {};
  override: Record<string, unknown> = {};

  private attachLabels(config: Record<string, any>, labels: Record<string, string>) {
    if (!config.metadata?.labels) {
      config.metadata.labels = {};
    }
    config.metadata.labels = { ...config.metadata?.labels, ...labels };
    return config;
  }

  build() {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(this.resources)) {
      const { type } = this.resources[key];
      let { config } = this.resources[key];
      if (!type) {
        result[key] = config;
        continue;
      }
      // Inject the managed-by label
      const injectedLabel: Record<string, string> = {};
      injectedLabel[LABEL_MANAGED_BY_KEY] = LABEL_MANAGED_BY_VALUE;
      config = this.attachLabels(config, injectedLabel);
      // Create the resource
      result[key] = new type(merge({}, config, this.override ? this.override[key] : {}));
    }
    return Object.values(result);
  }

  /**
   * Add a resource to the controller, extracting the type and data from the arguments.
   */

  add<Id extends string, T extends AnyClass>(params: { id: Id; type: T; config: ConstructorParameters<T>[0] }) {
    this.resources[params.id] = { type: params.type, config: params.config };
    return this as KubricateController<Resource & Record<Id, ConstructorParameters<T>[0]>>;
  }

  /**
   * Add an instance to the controller directly. Using this method will not support overriding the resource.
   */

  addInstance<Id extends string, T extends object = object>(params: { id: Id; config: T }) {
    this.resources[params.id] = { config: params.config as Record<string, unknown> };
    return this as KubricateController<Resource & Record<Id, T>>;
  }

  public overrideResources(override: Partial<Resource>) {
    this.override = override;
    return this;
  }
}
