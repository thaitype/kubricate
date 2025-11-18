import type { StackTemplateName } from './StackTemplateName.type.js';
import { version as coreVersion } from './version.js';

/**
 * User-facing metadata that stack template authors can provide.
 * Follows package.json conventions for familiarity.
 */
export interface StackTemplateMetadataInput {
  /**
   * Template version (required when metadata is provided).
   * Should follow semantic versioning (e.g., "1.0.0").
   */
  version: string;

  /**
   * Template author (optional).
   * Examples: "Platform Team", "John Doe <john@acme.com>"
   */
  author?: string;

  /**
   * Human-readable description of the stack template (optional).
   */
  description?: string;

  /**
   * Homepage URL for documentation or reference (optional).
   * Like package.json's homepage field.
   */
  homepage?: string;

  /**
   * Repository URL where the stack template is maintained (optional).
   * Like package.json's repository field.
   */
  repository?: string;
}

/**
 * Internal metadata that includes both user-provided fields and system-injected fields.
 * The coreVersion field is automatically injected and cannot be overridden by users.
 */
export interface StackTemplateMetadata extends StackTemplateMetadataInput {
  /**
   * Version of @kubricate/core used to define this template.
   * Automatically injected, cannot be set by users.
   */
  coreVersion: string;
}

/**
 * Configuration object for defining a stack template (preferred API).
 * Combines name, metadata, and build function in a single declarative object.
 */
export interface StackTemplateConfig<
  TInput,
  TResourceMap extends Record<string, unknown>,
  TName extends string = string,
> {
  /**
   * Stack template name. Must match one of these patterns:
   * - `<templateName>`
   * - `@<orgName>/<templateName>`
   * - `@<orgName>/<packageName>/<templateName>`
   *
   * Character set: a-z, 0-9, ., _, - (no spaces or uppercase)
   *
   * Examples:
   * - "simple-app"
   * - "@acme/simple-app"
   * - "@acme/app-stacks/simple-app"
   */
  name: StackTemplateName<TName>;

  /**
   * Optional metadata following package.json conventions.
   * When provided, version is required.
   */
  metadata?: StackTemplateMetadataInput;

  /**
   * Build function that takes input and returns a map of Kubernetes resources.
   * This function is called when the stack template is instantiated.
   */
  build: (input: TInput) => TResourceMap;
}

/**
 * Stack template type that combines name, build function, and optional metadata.
 */
export type StackTemplate<TInput, TResourceMap extends Record<string, unknown>, TName extends string = string> = {
  name: StackTemplateName<TName>;
  build: (input: TInput) => TResourceMap;
  metadata?: StackTemplateMetadata;
};

/**
 * Defines a stack template with a declarative configuration object (preferred API).
 *
 * This is the recommended way to define stack templates. It combines name, metadata,
 * and build function in a single object, making templates easy to extend and maintain.
 *
 * @param config - Configuration object with name, optional metadata, and build function.
 * @returns A stack template.
 *
 * @example
 * ```typescript
 * const SimpleApp = defineStackTemplate({
 *   name: '@acme/app-stacks/simple-app',
 *   metadata: {
 *     version: '1.0.0',
 *     author: 'Platform Team',
 *     homepage: 'https://docs.acme.com/simple-app',
 *     repository: 'https://github.com/acme/app-stacks',
 *   },
 *   build(input) {
 *     return {
 *       deployment: new Deployment({ ... }),
 *       service: new Service({ ... }),
 *     };
 *   },
 * });
 * ```
 */
export function defineStackTemplate<TInput, TResourceMap extends Record<string, unknown>, TName extends string>(
  config: StackTemplateConfig<TInput, TResourceMap, TName>
): StackTemplate<TInput, TResourceMap, TName>;

/**
 * Defines a stack template that builds resources based on the provided input.
 *
 * This is the legacy two-argument form for simple use cases.
 * Consider using the single-argument config object form for templates with metadata.
 *
 * @param name - The name of the stack template.
 * @param build - A function that takes an input and returns a map of resources.
 * @returns A stack template.
 *
 * @example
 * ```typescript
 * const SimpleApp = defineStackTemplate('simple-app', (input) => ({
 *   deployment: new Deployment({ ... }),
 *   service: new Service({ ... }),
 * }));
 * ```
 */
export function defineStackTemplate<TInput, TResourceMap extends Record<string, unknown>, TName extends string>(
  name: StackTemplateName<TName>,
  build: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap, TName>;

/**
 * Implementation of defineStackTemplate with overloads.
 */
export function defineStackTemplate<TInput, TResourceMap extends Record<string, unknown>, TName extends string>(
  nameOrConfig: StackTemplateName<TName> | StackTemplateConfig<TInput, TResourceMap, TName>,
  buildFn?: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap, TName> {
  // Check if this is the new single-argument config object form
  if (typeof nameOrConfig === 'object' && 'build' in nameOrConfig) {
    const config = nameOrConfig as StackTemplateConfig<TInput, TResourceMap, TName>;

    // Inject coreVersion if metadata is provided
    const metadata: StackTemplateMetadata | undefined = config.metadata
      ? { ...config.metadata, coreVersion }
      : undefined;

    return {
      name: config.name,
      build: config.build,
      metadata,
    };
  }

  // Legacy two-argument form: (name, build)
  if (!buildFn) {
    throw new Error('defineStackTemplate: build function is required when using the two-argument form');
  }

  return {
    name: nameOrConfig as StackTemplateName<TName>,
    build: buildFn,
    metadata: undefined,
  };
}
