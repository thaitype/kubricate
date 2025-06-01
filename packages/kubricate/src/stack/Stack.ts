
import { ResourceComposer } from './ResourceComposer.js';

import { BaseStack } from './BaseStack.js';
import type { StackTemplate } from '@kubricate/core';

/**
 * A function that takes input data and returns a `ResourceComposer` with resource entries.
 *
 * @template Data - The input type for the stack
 * @template Entries - The structure of the composed resource map
 */
export type ConfigureComposerFunction<Data, Entries extends Record<string, unknown>> = (
  data: Data
) => ResourceComposer<Entries>;

/**
 * Represents a runtime stack built from a pure template.
 *
 * The `Stack` class extends `BaseStack` and adds support for dynamic creation
 * from input data and orchestration features like secret injection and CLI deployment.
 *
 * @template Data - The input type used to build the stack
 * @template Entries - The resource structure returned by the builder
 */
export class Stack<Data, Entries extends Record<string, unknown>> extends BaseStack<
  ConfigureComposerFunction<Data, Entries>
> {
  constructor(public builder: ConfigureComposerFunction<Data, Entries>) {
    super();
  }

  /**
   * Converts a `StackTemplate` and input into a runtime `Stack` instance.
   *
   * This function is the bridge between static template definition (via `defineStackTemplate`)
   * and runtime execution. It wraps the resulting resources into a `ResourceComposer`
   * and binds metadata (like stack name).
   *
   * @template TInput - Input type for the stack template
   * @template TResourceMap - Output resource map from the stack template
   *
   * @param factory - A `StackTemplate` containing the stack's name and builder function
   * @param input - Input values required to create the resource map
   * @returns A fully-initialized `Stack` ready for use
   *
   * @example
   * ```ts
   * const appStack = Stack.fromTemplate(AppStack, {
   *   name: 'nginx',
   *   image: 'nginx:latest',
   * });
   *
   * appStack.useSecrets(...).deploy();
   * ```
   */
  static fromTemplate<TInput, TResourceMap extends Record<string, unknown>>(
    factory: StackTemplate<TInput, TResourceMap>,
    input: TInput
  ): Stack<TInput, TResourceMap> {
    const builder = (data: TInput) => {
      const resources = factory.create(data);
      const composer = new ResourceComposer<TResourceMap>();
      for (const [id, resource] of Object.entries(resources)) {
        composer.addObject({
          id,
          config: resource as object,
        });
      }
      return composer;
    };

    const stack = new Stack(builder);
    stack.setName(factory.name);
    stack.from(input);
    return stack;
  }

  /**
   * Populates this stack instance with input data by executing its internal builder.
   *
   * This is used internally by `fromTemplate` or can be used directly when constructing
   * `Stack` manually via constructor (not recommended).
   *
   * @param data - Input values for the stack
   * @returns This stack instance
   */
  override from(data: Data) {
    const composer = this.builder(data);
    this.setComposer(composer);
    return this;
  }
}

/**
 * Factory function to create a `Stack` instance manually.
 *
 * @deprecated Use `defineStackTemplate` together with `Stack.fromTemplate` instead.
 * 
 * This method was previously used to define a stack template along with a `from` method,
 * but it mixes type definition with runtime logic. For better separation of concerns,
 * define your stack using `defineStackTemplate(...)` and then instantiate it using `Stack.fromTemplate(...)`.
 *
 * @example
 * ```ts
 * // ❌ Deprecated way
 * const legacyStack = createStack('MyStack', builderFn).from(input);
 *
 * // ✅ Recommended way
 * const MyStackTemplate = defineStackTemplate('MyStack', builderFn);
 * const stack = Stack.fromTemplate(MyStackTemplate, input);
 * ```
 */
export function createStack<Data, Entries extends Record<string, unknown> = {}>(
  name: string,
  builder: ConfigureComposerFunction<Data, Entries>
) {
  return {
    from(data: Data) {
      const stack = new Stack<Data, Entries>(builder);
      stack.setName(name);
      return stack.from(data);
    },
  };
}