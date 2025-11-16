import { createHash } from 'node:crypto';

import { cloneDeep } from 'lodash-es';

import { LABELS } from './constants.js';

export interface MetadataInjectorOptions {
  type: 'stack' | 'secret';
  kubricateVersion: string;
  managedAt?: string;

  // Stack fields
  stackId?: string;
  stackTemplateName?: string; // NEW (renamed from stackName)
  resourceId?: string;

  // Stack template metadata (NEW)
  // Note: This is the full StackTemplateMetadata (includes coreVersion)
  stackTemplateMetadata?: {
    version: string; // Template version (required if metadata exists)
    author?: string;
    description?: string;
    homepage?: string;
    repository?: string;
    coreVersion: string; // Always present when metadata exists
  };

  // Secret fields
  secretManagerId?: string;
  secretManagerName?: string;

  /**
   * Inject Options to enable/disable to the labels and annotations injected into the resource.
   */
  inject?: {
    managedAt?: boolean;
    resourceHash?: boolean;
    version?: boolean;
  };
}

export class MetadataInjector {
  constructor(private readonly options: MetadataInjectorOptions) {}

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
      metadata.labels[LABELS.resourceId] = this.options.resourceId!;

      // NEW: Use stack-template-name instead of stack-name
      metadata.annotations[LABELS.stackTemplateName] = this.options.stackTemplateName!;

      // DEPRECATED: Keep old stack-name for backward compatibility (will be removed in v1.0)
      metadata.annotations[LABELS.stackName] = this.options.stackTemplateName!;

      // Inject stack template metadata if available
      const templateMeta = this.options.stackTemplateMetadata;
      if (templateMeta) {
        // coreVersion is always injected when metadata exists
        metadata.annotations[LABELS.stackTemplateCoreVersion] = templateMeta.coreVersion;

        // version is required when metadata exists
        metadata.annotations[LABELS.stackTemplateVersion] = templateMeta.version;

        // Optional fields (only inject if present)
        if (templateMeta.author) {
          metadata.annotations[LABELS.stackTemplateAuthor] = templateMeta.author;
        }
        if (templateMeta.description) {
          metadata.annotations[LABELS.stackTemplateDescription] = templateMeta.description;
        }
        if (templateMeta.homepage) {
          metadata.annotations[LABELS.stackTemplateHomepage] = templateMeta.homepage;
        }
        if (templateMeta.repository) {
          metadata.annotations[LABELS.stackTemplateRepository] = templateMeta.repository;
        }
      }
    } else if (this.options.type === 'secret') {
      metadata.labels[LABELS.secretManagerId] = this.options.secretManagerId!;
      metadata.annotations[LABELS.secretManagerName] = this.options.secretManagerName!;
    }

    if (this.options.inject?.version) {
      metadata.annotations[LABELS.version] = this.options.kubricateVersion;
    }

    if (this.options.inject?.resourceHash) {
      metadata.annotations[LABELS.resourceHash] = this.calculateHash(resource);
    }

    if (this.options.inject?.managedAt) {
      metadata.annotations[LABELS.managedAt] = this.options.managedAt ?? new Date().toISOString();
    }

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
      return obj.map(item => this.sortKeysRecursively(item));
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
