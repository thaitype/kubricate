import type { KubricateConfig, ProjectGenerateOptions } from "@kubricate/core";
import path from "node:path";
import { stringify as yamlStringify } from 'yaml';

export interface RenderedResource {
  stackName: string;
  kind: string;
  name: string;
  content: string;
}

export function renderStacks(config: KubricateConfig): RenderedResource[] {
  const output: RenderedResource[] = [];

  if (!config.stacks || Object.keys(config.stacks ?? {}).length === 0) {
    throw new Error('No stacks found in config');
  }

  for (const [stackName, stack] of Object.entries(config.stacks)) {
    const builtResources = stack.build()

    for (const resource of builtResources as Array<{ kind?: string; metadata?: { name?: string } }>) {
      const kind = resource?.kind || 'UnknownKind';
      const name = resource?.metadata?.name || 'unnamed';

      const content = yamlStringify(resource) + '---\n';

      output.push({ stackName, kind, name, content });
    }
  }

  return output;
}

export function resolveOutputPath(resource: RenderedResource, mode: ProjectGenerateOptions['outputMode']): string {
  switch (mode) {
    case 'flat':
      return 'stacks.yml';
    case 'stack':
      return `${resource.stackName}.yml`;
    case 'resource':
      return path.join(resource.stackName, `${resource.kind}_${resource.name}.yml`);
  }
  throw new Error(`Unknown output mode: ${mode}`);
}