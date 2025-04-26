import { merge, isPlainObject } from 'lodash-es';
import type { AnyClass } from './types.js';
import type { Call, Objects } from 'hotscript';
import { get, set } from 'lodash-es';

export interface ResourceEntry {
  type?: AnyClass;
  config: Record<string, unknown>;
  /**
   * The kind of resource. This is used to determine how to handle the resource.
   * - `class`: A class that will be instantiated with the config.
   * - `object`: An object that will be used as is.
   * - `instance`: An instance of a class that will be used as is.
   */
  entryType: 'class' | 'object' | 'instance';
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class ResourceComposer<Entries extends Record<string, unknown> = {}> {
  _entries: Record<string, ResourceEntry> = {};
  _override: Record<string, unknown> = {};

  inject(resourceId: string, path: string, value: unknown) {
    const composed = this._entries[resourceId];
    if (!composed) {
      throw new Error(`Cannot inject, resource with ID ${resourceId} not found.`);
    }
    if (!(composed.entryType === 'object' || composed.entryType === 'class')) {
      throw new Error(`Cannot inject, resource with ID ${resourceId} is not an object or class.`);
    }

    const existingValue = get(composed.config, path);

    if (existingValue === undefined) {
      // No value yet — safe to set directly
      set(composed.config, path, value);
      return;
    }

    if (Array.isArray(existingValue) && Array.isArray(value)) {
      // Append array elements (e.g. env vars, volumeMounts)
      const mergedArray = [...existingValue, ...value];
      set(composed.config, path, mergedArray);
      return;
    }

    if (isPlainObject(existingValue) && isPlainObject(value)) {
      // Deep merge objects
      const mergedObject = merge({}, existingValue, value);
      set(composed.config, path, mergedObject);
      return;
    }

    // Fallback: do not overwrite primitive or incompatible types
    throw new Error(
      `Cannot inject, resource "${resourceId}" already has a value at path "${path}". ` +
      `Existing: ${JSON.stringify(existingValue)}. New value: ${JSON.stringify(value)}`
    );
  }

  // private ensureMetadata(resource: Record<string, unknown>) {
  //   if (!('metadata' in resource)) {
  //     resource.metadata = {};
  //   }
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   const metadata = resource.metadata as Record<string, any>;
  //   metadata.labels ??= {};
  //   metadata.annotations ??= {};
  //   return metadata;
  // }

  // injectMetadata(resource: Record<string, unknown>, resourceId: string) {
  //   const metadata = this.ensureMetadata(resource);

  //   metadata.labels ??= {};
  //   metadata.annotations ??= {};

  //   metadata.labels['thaitype.dev/kubricate'] = 'true';
  //   metadata.labels['thaitype.dev/kubricate/resource-id'] = resourceId;
  //   return resource;
  // }

  build(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(this._entries)) {
      const { type, entryType: kind } = this._entries[key];
      const { config } = this._entries[key];

      if (kind === 'instance') {
        result[key] = config;
        continue;
      }

      const mergedConfig = merge({}, config, this._override ? this._override[key] : {});
      if (kind === 'object') {
        result[key] = mergedConfig;
        continue;
      }
      if (!type) continue;
      // Create the resource
      result[key] = new type(mergedConfig);
    }
    return result;
  }

  /**
   * Add a resource to the composer, extracting the type and data from the arguments.
   *
   * @deprecated This method is deprecated and will be removed in the future. Use `addClass` instead.
   */

  add<Id extends string, T extends AnyClass>(params: { id: Id; type: T; config: ConstructorParameters<T>[0] }) {
    this._entries[params.id] = {
      type: params.type,
      config: params.config,
      entryType: 'class',
    };
    return this as ResourceComposer<Entries & Record<Id, ConstructorParameters<T>[0]>>;
  }

  /**
   * Add a resource to the composer, extracting the type and data from the arguments.
   */

  addClass<const Id extends string, T extends AnyClass>(params: {
    id: Id;
    type: T;
    config: ConstructorParameters<T>[0];
  }) {
    this._entries[params.id] = {
      type: params.type,
      config: params.config,
      entryType: 'class',
    };
    return this as ResourceComposer<Entries & Record<Id, ConstructorParameters<T>[0]>>;
  }

  /**
   * Add an object to the composer directly. Using this method will support overriding the resource.
   */
  addObject<const Id extends string, T extends object = object>(params: { id: Id; config: T }) {
    this._entries[params.id] = {
      config: params.config as Record<string, unknown>,
      entryType: 'object',
    };
    return this as ResourceComposer<Entries & Record<Id, T>>;
  }

  /**
   * Add an instance to the composer directly. Using this method will not support overriding the resource.
   *
   * @deprecated This method is deprecated and will be removed in the future. Use `addObject` instead for supporting overrides.
   */

  addInstance<Id extends string, T extends object = object>(params: { id: Id; config: T }) {
    this._entries[params.id] = {
      config: params.config as Record<string, unknown>,
      entryType: 'instance',
    };
    return this as ResourceComposer<Entries & Record<Id, T>>;
  }

  public override(overrideResources: Call<Objects.PartialDeep, Entries>) {
    this._override = overrideResources;
    return this;
  }

  /**
   * @interal Find all resource IDs of a specific kind.
   * This method is useful for filtering resources based on their kind.
   */

  findResourceIdsByKind(kind: string): string[] {
    const resourceIds: string[] = [];
    const buildResources: unknown[] = Object.values(this.build());
    const entryIds = Object.keys(this._entries);

    for (let i = 0; i < buildResources.length; i++) {
      const resource = buildResources[i];
      const resourceId = entryIds[i];

      if (
        typeof resource === 'object' &&
        resource !== null &&
        'kind' in resource &&
        typeof resource.kind === 'string'
      ) {
        if (resource.kind.toLowerCase() === kind.toLowerCase()) {
          resourceIds.push(resourceId);
        }
      }
    }

    return resourceIds;
  }


}
