import merge from 'lodash.merge';

export type AnyClass = { new (...args: any[]): any };

export type ResourceStore = Record<
  string,
  {
    type?: AnyClass;
    data: Record<string, unknown>;
  }
>;

export class KubricateController<Resource extends Record<string, unknown> = {}> {
  resources: ResourceStore = {};
  override: Record<string, unknown> = {};

  build() {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(this.resources)) {
      const { type, data } = this.resources[key];
      if (!type) {
        result[key] = data;
        continue;
      }
      result[key] = new type(merge({}, data, this.override ? this.override[key] : {}));
    }
    return Object.values(result);
  }

  /**
   * Add a resource to the controller, extracting the type and data from the arguments.
   */

  add<Name extends string, T extends AnyClass>(name: Name, type: T, data: ConstructorParameters<T>[0]) {
    this.resources[name] = { type, data };
    return this as KubricateController<Resource & Record<Name, ConstructorParameters<T>[0]>>;
  }

  /**
   * Add an instance to the controller directly. Using this method will not support overriding the resource.
   */

  addInstance<Name extends string, T extends object = object>(name: Name, data: T) {
    this.resources[name] = { data: data as Record<string, unknown> };
    return this as KubricateController<Resource & Record<Name, T>>;
  }

  public overrideResources(override: Partial<Resource>) {
    this.override = override;
    return this;
  }
}
