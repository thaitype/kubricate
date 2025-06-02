import path from 'node:path';

import c from 'ansis';
import { cloneDeep, merge } from 'lodash-es';
import { stringify as yamlStringify } from 'yaml';

import type { BaseLogger } from '@kubricate/core';

import { getClassName } from '../../internal/utils.js';
import type { KubricateConfig, ProjectMetadataOptions } from '../../types.js';
import { version } from '../../version.js';
import { MetadataInjector } from '../MetadataInjector.js';
import type { ProjectGenerateOptions } from './types.js';

export interface RenderedResource {
  id: string;
  stackId: string;
  stackName: string;
  kind: string;
  name: string;
  content: string;
}

const defaultMetadata: Required<ProjectMetadataOptions> = {
  inject: true,
  injectManagedAt: true,
  injectResourceHash: true,
  injectVersion: true,
};

interface KubernetesMetadata {
  kind?: string;
  metadata?: { name?: string };
}

export class Renderer {
  public readonly metadata: Required<ProjectMetadataOptions>;

  constructor(
    globalOptions: KubricateConfig,
    private readonly logger: BaseLogger
  ) {
    this.metadata = merge({}, defaultMetadata, globalOptions.metadata);
  }

  injectMetadata(
    resources: Record<string, unknown>,
    options: { stackId?: string; stackName?: string }
  ): Record<string, unknown> {
    const createInjector = (resourceId: string) =>
      new MetadataInjector({
        type: 'stack',
        kubricateVersion: version,
        managedAt: new Date().toISOString(),
        stackId: options.stackId,
        stackName: options.stackName,
        resourceId,
        inject: {
          managedAt: this.metadata.injectManagedAt,
          resourceHash: this.metadata.injectResourceHash,
          version: this.metadata.injectVersion,
        },
      });

    const output: Record<string, unknown> = {};
    for (const [resourceId, resource] of Object.entries(resources)) {
      const clone = cloneDeep(resource);
      if (clone && typeof clone !== 'object') {
        this.logger.warn(c.yellow('Warning: Resource is not an object, skipping metadata injection.'));
        continue;
      }
      const injector = createInjector(resourceId);
      injector.inject(clone as Record<string, unknown>);
      output[resourceId] = clone;
    }
    return output;
  }

  renderStacks(config: KubricateConfig): RenderedResource[] {
    const output: RenderedResource[] = [];

    if (!config.stacks || Object.keys(config.stacks ?? {}).length === 0) {
      throw new Error('No stacks found in config');
    }

    for (const [stackId, stack] of Object.entries(config.stacks)) {
      let builtResources: Record<string, unknown> = {};
      const stackName = stack.getName() ?? getClassName(stack) ?? 'unknown';
      if (this.metadata.inject === true) {
        builtResources = this.injectMetadata(stack.build(), {
          stackId,
          stackName,
        });
      } else {
        builtResources = stack.build();
        this.logger.debug(`Warning: Metadata injection is disabled, skipping metadata injection`);
      }

      for (const [resourceId, resource] of Object.entries(builtResources as Record<string, KubernetesMetadata>)) {
        const kind = resource?.kind || 'UnknownKind';
        const name = resource?.metadata?.name || 'unnamed';
        const content = yamlStringify(resource) + '---\n';
        output.push({ stackName, kind, name, content, id: resourceId, stackId });
      }
    }

    return output;
  }

  resolveOutputPath(resource: RenderedResource, mode: ProjectGenerateOptions['outputMode'], stdout: boolean): string {
    if (stdout) {
      // Create canonical name for the resource groped by stackId and resourceId
      return `${resource.stackId}.${resource.id}`;
    }

    switch (mode) {
      case 'flat':
        return 'stacks.yml';
      case 'stack':
        return `${resource.stackId}.yml`;
      case 'resource':
        return path.join(resource.stackId, `${resource.kind}_${resource.id}.yml`);
    }
    throw new Error(`Unknown output mode: ${mode}`);
  }
}
