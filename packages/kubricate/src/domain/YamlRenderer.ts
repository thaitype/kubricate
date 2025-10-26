import path from 'node:path';

import { stringify as yamlStringify } from 'yaml';

import type { ProjectGenerateOptions } from '../commands/generate/types.js';

/**
 * Resource information needed for rendering
 */
export interface ResourceInfo {
  /**
   * Stack identifier
   */
  stackId: string;

  /**
   * Resource identifier within the stack
   */
  id: string;

  /**
   * Kubernetes resource kind (e.g., "Deployment", "Service")
   */
  kind: string;
}

/**
 * YamlRenderer handles pure YAML rendering and output path resolution.
 *
 * This is a pure class with no side effects - it doesn't log, doesn't
 * mutate input, and has no dependencies beyond the yaml library.
 * Perfect for unit testing.
 */
export class YamlRenderer {
  /**
   * Renders a Kubernetes resource to YAML format with document separator.
   *
   * This is a pure function that:
   * - Takes a resource object
   * - Converts it to YAML string
   * - Appends the YAML document separator ('---\n')
   * - Has zero side effects (no logging, no mutation)
   *
   * @param resource - The Kubernetes resource object to render
   * @returns YAML string with document separator
   *
   * @example
   * ```typescript
   * const renderer = new YamlRenderer();
   * const resource = {
   *   apiVersion: 'v1',
   *   kind: 'Service',
   *   metadata: { name: 'my-service' }
   * };
   *
   * const yaml = renderer.renderToYaml(resource);
   * // Returns:
   * // apiVersion: v1
   * // kind: Service
   * // metadata:
   * //   name: my-service
   * // ---
   * ```
   */
  renderToYaml(resource: unknown): string {
    return yamlStringify(resource) + '---\n';
  }

  /**
   * Resolves the output file path based on the output mode and resource info.
   *
   * This is a pure function that determines where a resource should be written
   * based on the generation mode:
   *
   * - **stdout mode**: Returns canonical name `stackId.resourceId`
   * - **flat mode**: All resources go to `stacks.yml`
   * - **stack mode**: One file per stack: `stackId.yml`
   * - **resource mode**: One file per resource: `stackId/Kind_resourceId.yml`
   *
   * @param resource - Resource information (stackId, id, kind)
   * @param mode - Output mode (flat, stack, or resource)
   * @param stdout - Whether outputting to stdout
   * @returns Relative file path for the resource
   * @throws Error if mode is unknown
   *
   * @example
   * ```typescript
   * const renderer = new YamlRenderer();
   * const resource = { stackId: 'app', id: 'deployment', kind: 'Deployment' };
   *
   * // Stack mode (one file per stack)
   * renderer.resolveOutputPath(resource, 'stack', false);
   * // Returns: "app.yml"
   *
   * // Resource mode (one file per resource)
   * renderer.resolveOutputPath(resource, 'resource', false);
   * // Returns: "app/Deployment_deployment.yml"
   *
   * // Flat mode (single file)
   * renderer.resolveOutputPath(resource, 'flat', false);
   * // Returns: "stacks.yml"
   *
   * // Stdout mode (canonical name)
   * renderer.resolveOutputPath(resource, 'stack', true);
   * // Returns: "app.deployment"
   * ```
   */
  resolveOutputPath(resource: ResourceInfo, mode: ProjectGenerateOptions['outputMode'], stdout: boolean): string {
    if (stdout) {
      // Create canonical name for the resource grouped by stackId and resourceId
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
