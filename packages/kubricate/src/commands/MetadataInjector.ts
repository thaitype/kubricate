import { createHash } from 'node:crypto';
import { cloneDeep } from 'lodash-es';
import { LABELS } from './constants.js';

export interface MetadataInjectorOptions {
  type: 'stack' | 'secret';
  kubricateVersion: string;
  managedAt?: string;
  calculateHash?: boolean;

  // Stack fields
  stackId?: string;
  stackName?: string;
  resourceId?: string;

  // Secret fields
  secretManagerId?: string;
  secretManagerName?: string;
}

export class MetadataInjector {
  constructor(private readonly options: MetadataInjectorOptions) { }

  inject(resource: Record<string, unknown>): Record<string, unknown> {
    if (typeof resource !== 'object' || resource == null) {
      return resource;
    }

    const metadata = this.ensureMetadata(resource);

    metadata.labels ??= {};
    metadata.annotations ??= {};

    metadata.labels[LABELS.kubricate] = 'true';

    if (this.options.type === 'stack') {
      metadata.labels[LABELS.stackId] = this.options.stackId!;
      metadata.annotations[LABELS.stackName] = this.options.stackName!;
      metadata.labels[LABELS.resourceId] = this.options.resourceId!;
    } else if (this.options.type === 'secret') {
      metadata.labels[LABELS.secretManagerId] = this.options.secretManagerId!;
      metadata.annotations[LABELS.secretManagerName] = this.options.secretManagerName!;
    }

    metadata.annotations[LABELS.version] = this.options.kubricateVersion;
  
    if (this.options.calculateHash) {
      metadata.annotations[LABELS.resourceHash] = this.calculateHash(resource);
    }

    metadata.annotations[LABELS.managedAt] = this.options.managedAt ?? new Date().toISOString();

    return resource;
  }

  private ensureMetadata(resource: Record<string, unknown>) {
    if (!('metadata' in resource)) {
      resource.metadata = {};
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = resource.metadata as Record<string, any>;
    metadata.labels ??= {};
    metadata.annotations ??= {};
    return metadata;
  }

  private calculateHash(resource: Record<string, unknown>): string {
    const cleaned = this.cleanForHash(resource);
    const sorted = this.sortKeysRecursively(cleaned);
    const serialized = JSON.stringify(sorted);
    return createHash('sha256').update(serialized).digest('hex');
  }

  private cleanForHash(resource: Record<string, unknown>): Record<string, unknown> {
    const clone = cloneDeep(resource);
    if (clone.metadata && typeof clone.metadata === 'object') {
      const metadata = clone.metadata as Record<string, unknown>;

      delete metadata.creationTimestamp;
      delete metadata.resourceVersion;
      delete metadata.uid;
      delete metadata.selfLink;
      delete metadata.generation;
      delete metadata.managedFields;
    }
    return clone;
  }

  private sortKeysRecursively(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortKeysRecursively(item));
    }
    if (obj && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (acc as any)[key] = this.sortKeysRecursively((obj as any)[key]);
          return acc;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, {} as any);
    }
    return obj;
  }
}
