import merge from 'lodash.merge';
import type { AnyClass } from './types.js';

export type ResourceStore = Record<
  string,
  {
    type?: AnyClass;
    config: Record<string, unknown>;
  }
>;

export const LABEL_MANAGED_BY_KEY = 'thaitype.dev/managed-by';
export const LABEL_MANAGED_BY_VALUE = 'kubricate';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class KubricateComposer<Resource extends Record<string, unknown> = {}> {
  _resources: ResourceStore = {};
  _override: Record<string, unknown> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private attachLabels(config: Record<string, any>, labels: Record<string, string>) {
    if (!config.metadata?.labels) {
      config.metadata.labels = {};
    }
    config.metadata.labels = { ...config.metadata?.labels, ...labels };
    return config;
  }

  build() {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(this._resources)) {
      const { type } = this._resources[key];
      let { config } = this._resources[key];
      if (!type) {
        result[key] = config;
        continue;
      }
      // Inject the managed-by label
      const injectedLabel: Record<string, string> = {};
      injectedLabel[LABEL_MANAGED_BY_KEY] = LABEL_MANAGED_BY_VALUE;
      config = this.attachLabels(config, injectedLabel);
      // Create the resource
      result[key] = new type(merge({}, config, this._override ? this._override[key] : {}));
    }
    return Object.values(result);
  }

  /**
   * Add a resource to the composer, extracting the type and data from the arguments.
   */

  add<Id extends string, T extends AnyClass>(params: { id: Id; type: T; config: ConstructorParameters<T>[0] }) {
    this._resources[params.id] = { type: params.type, config: params.config };
    return this as KubricateComposer<Resource & Record<Id, ConstructorParameters<T>[0]>>;
  }

  /**
   * Add an instance to the composer directly. Using this method will not support overriding the resource.
   */

  addInstance<Id extends string, T extends object = object>(params: { id: Id; config: T }) {
    this._resources[params.id] = { config: params.config as Record<string, unknown> };
    return this as KubricateComposer<Resource & Record<Id, T>>;
  }

  public override(overrideResources: Partial<Resource>) {
    this._override = overrideResources;
    return this;
  }
}
