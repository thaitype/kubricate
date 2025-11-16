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
 * Descriptor for rich stack template definition.
 * Allows specifying name and metadata in a structured way.
 */
export interface StackTemplateDescriptor {
  /**
   * Stack template name. Must match one of these patterns:
   * - <templateName>
   * - @<orgName>/<templateName>
   * - @<orgName>/<packageName>/<templateName>
   *
   * Character set: a-z, 0-9, ., _, - (no spaces or uppercase)
   *
   * Examples:
   * - "simple-app"
   * - "@acme/simple-app"
   * - "@acme/app-stacks/simple-app"
   */
  name: string;

  /**
   * Optional metadata following package.json conventions.
   * When provided, version is required.
   */
  metadata?: StackTemplateMetadataInput;
}

/**
 * Stack template type that combines name, create function, and optional metadata.
 */
export type StackTemplate<TInput, TResourceMap extends Record<string, unknown>> = {
  name: string;
  create: (input: TInput) => TResourceMap;
  metadata?: StackTemplateMetadata;
};

/**
 * Defines a stack factory that creates a stack of resources based on the provided input.
 *
 * @param name - The name of the stack template.
 * @param factory - A function that takes an input and returns a map of resources.
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
export function defineStackTemplate<TInput, TResourceMap extends Record<string, unknown>>(
  name: string,
  factory: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap>;

/**
 * Defines a stack factory with rich metadata.
 *
 * @param descriptor - Stack template descriptor with name and optional metadata.
 * @param factory - A function that takes an input and returns a map of resources.
 * @returns A stack template.
 *
 * @example
 * ```typescript
 * const SimpleApp = defineStackTemplate(
 *   {
 *     name: '@acme/app-stacks/simple-app',
 *     metadata: {
 *       version: '1.0.0',
 *       author: 'Platform Team',
 *       homepage: 'https://docs.acme.com/simple-app',
 *       repository: 'https://github.com/acme/app-stacks',
 *     },
 *   },
 *   (input) => ({
 *     deployment: new Deployment({ ... }),
 *     service: new Service({ ... }),
 *   })
 * );
 * ```
 */
export function defineStackTemplate<TInput, TResourceMap extends Record<string, unknown>>(
  descriptor: StackTemplateDescriptor,
  factory: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap>;

/**
 * Implementation of defineStackTemplate with overloads.
 */
export function defineStackTemplate<TInput, TResourceMap extends Record<string, unknown>>(
  nameOrDescriptor: string | StackTemplateDescriptor,
  factory: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap> {
  const descriptor: StackTemplateDescriptor =
    typeof nameOrDescriptor === 'string' ? { name: nameOrDescriptor } : nameOrDescriptor;

  // Inject coreVersion if metadata is provided
  // This ensures users cannot override it
  const metadata: StackTemplateMetadata | undefined = descriptor.metadata
    ? { ...descriptor.metadata, coreVersion }
    : undefined;

  return {
    name: descriptor.name,
    create: factory,
    metadata,
  };
}
