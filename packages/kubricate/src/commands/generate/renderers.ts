import type { BaseLogger, KubricateConfig, ProjectGenerateOptions, ProjectMetadataOptions } from "@kubricate/core";
import path from "node:path";
import { stringify as yamlStringify } from 'yaml';
import { MetadataInjector } from "../MetadataInjector.js";
import { version } from "../../version.js";
import c from 'ansis';
import { cloneDeep, merge } from "lodash-es";
import { getClassName } from "../../internal/utils.js";

export interface RenderedResource {
  id: string;
  stackName: string;
  kind: string;
  name: string;
  content: string;
}

const defaultMetadata: Required<ProjectMetadataOptions> = {
  inject: true,
};

interface KubernetesMetadata {
  kind?: string; metadata?: { name?: string }
}

export class Renderer {

  public readonly metadata: Required<ProjectMetadataOptions>;

  constructor(globalOptions: KubricateConfig, private readonly logger: BaseLogger,) {
    this.metadata = merge({}, defaultMetadata, globalOptions.metadata);
  }

  injectMetadata(resources: Record<string, unknown>, options: { stackId?: string, stackName?: string }): Record<string, unknown> {
    const createInjector = (resourceId: string) =>
      new MetadataInjector({
        type: 'stack',
        kubricateVersion: version,
        managedAt: new Date().toISOString(),
        stackId: options.stackId,
        stackName: options.stackName,
        resourceId,
        calculateHash: true,
      })

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
      if (this.metadata.inject === true) {
        builtResources = this.injectMetadata(stack.build(), {
          stackId,
          stackName: stack.getName() ?? getClassName(stack) ?? 'unknown',
        });
      } else {
        builtResources = stack.build();
        this.logger.debug(`Warning: Metadata injection is disabled, skipping metadata injection`);
      }

      for (const [resourceId, resource] of Object.entries(builtResources as Record<string, KubernetesMetadata>)) {
        const kind = resource?.kind || 'UnknownKind';
        const name = resource?.metadata?.name || 'unnamed';
        const content = yamlStringify(resource) + '---\n';
        output.push({ stackName: stackId, kind, name, content, id: resourceId });
      }
    }

    return output;
  }

  resolveOutputPath(resource: RenderedResource, mode: ProjectGenerateOptions['outputMode']): string {
    switch (mode) {
      case 'flat':
        return 'stacks.yml';
      case 'stack':
        return `${resource.stackName}.yml`;
      case 'resource':
        return path.join(resource.stackName, `${resource.kind}_${resource.id}.yml`);
      case 'stdout':
        return 'stdout';
    }
    throw new Error(`Unknown output mode: ${mode}`);
  }

}
