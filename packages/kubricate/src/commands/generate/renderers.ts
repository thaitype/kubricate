import type { BaseLogger, KubricateConfig, ProjectGenerateOptions } from "@kubricate/core";
import path from "node:path";
import { stringify as yamlStringify } from 'yaml';
import { MetadataInjector } from "../MetadataInjector.js";
import { version } from "../../version.js";
import c from 'ansis';
import { cloneDeep } from "lodash-es";
import { getClassName } from "../../internal/utils.js";

export interface RenderedResource {
  id: string;
  stackName: string;
  kind: string;
  name: string;
  content: string;
}

export class Renderer {
  constructor(private readonly logger: BaseLogger) { }

  injectMetadata(resources: unknown[], options: { stackId?: string, stackName?: string }): unknown[] {
    const injector = new MetadataInjector({
      type: 'stack',
      kubricateVersion: version,
      managedAt: new Date().toISOString(),
      stackId: options.stackId,
      stackName: options.stackName,
      calculateHash: true,
    });
    const output: unknown[] = [];
    for (const resource of resources) {
      const clone = cloneDeep(resource);
      if (clone && typeof clone !== 'object') {
        this.logger.warn(c.yellow('Warning: Resource is not an object, skipping metadata injection.'));
        continue;
      }
      injector.inject(clone as Record<string, unknown>);
      output.push(clone);
    }
    return output;
  }

  extractReourceIdFromMetadata(resource: unknown): string | undefined {
    if (typeof resource !== 'object' || resource === null) {
      this.logger.warn(c.yellow('Warning: Resource is not an object, skipping metadata extraction.'));
      return;
    }
    if (!('metadata' in resource)) {
      this.logger.warn(c.yellow('Warning: Resource does not have metadata, skipping metadata extraction.'));
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = resource.metadata as Record<string, any>;
    const resourceId = metadata.labels['thaitype.dev/kubricate/resource-id'];
    return resourceId;
  }

  renderStacks(config: KubricateConfig): RenderedResource[] {
    const output: RenderedResource[] = [];

    if (!config.stacks || Object.keys(config.stacks ?? {}).length === 0) {
      throw new Error('No stacks found in config');
    }

    for (const [stackId, stack] of Object.entries(config.stacks)) {
      const builtResources = this.injectMetadata(stack.build(), {
        stackId,
        stackName: stack.getName() ?? getClassName(stack) ?? 'unknown',
      });

      for (const resource of builtResources as Array<{ kind?: string; metadata?: { name?: string } }>) {
        const kind = resource?.kind || 'UnknownKind';
        const name = resource?.metadata?.name || 'unnamed';

        const content = yamlStringify(resource) + '---\n';

        const resourceId = this.extractReourceIdFromMetadata(resource) ?? name ?? 'unknown';
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
    }
    throw new Error(`Unknown output mode: ${mode}`);
  }

}
