import merge from 'lodash.merge';

export type AnyClass = { new (...args: any[]): any };

export type ResourceStore = Record<string, { type: AnyClass; data: Record<string, unknown> }>;

export class ResourceBuilder<Resource extends Record<string, unknown> = {}> {
  resources: ResourceStore = {};
  override: Record<string, unknown> = {};
  // constructor(public type: Type, data: ConstructorParameters<Type>[0], override?: ConstructorParameters<Type>[0]) {}

  build() {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(this.resources)) {
      const { type, data } = this.resources[key];
      result[key] = new type(merge({}, data, this.override ? this.override[key] : {}));
    }
    return Object.values(result);
  }

  add<Name extends string, T extends AnyClass>(name: Name, type: T, data: ConstructorParameters<T>[0]) {
    this.resources[name] = { type, data };
    return this as ResourceBuilder<Resource & Record<Name, ConstructorParameters<T>[0]>>;
  }

  public overrideResources(override: Partial<Resource>) {
    this.override = override;
    return this;
  }
}
