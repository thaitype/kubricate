
import { ResourceComposer } from './ResourceComposer.js';

import { BaseStack } from './BaseStack.js';
import type { StackFactory } from '@kubricate/core';

export type ConfigureComposerFunction<Data, Entries extends Record<string, unknown>> = (
  data: Data
) => ResourceComposer<Entries>;

// Generic stack class that holds builder function internally
export class Stack<Data, Entries extends Record<string, unknown>> extends BaseStack<
  ConfigureComposerFunction<Data, Entries>
> {
  constructor(public builder: ConfigureComposerFunction<Data, Entries>) {
    super();
  }

  override from(data: Data) {
    const composer = this.builder(data);
    this.setComposer(composer);
    return this;
  }
}

/**
 * Factory function to create stack
 *
 * @deprecated Use `initStack` instead, which is more flexible and supports runtime input.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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

/**
 * Creates a runtime-ready stack from a given stack factory and input.
 *
 * This function takes a pure stack definition (created using `defineStack`) and user-provided input,
 * then wraps the resulting resource map into a `Stack` that supports additional orchestration
 * like secret injection and CLI-based deployment.
 *
 * @template I - The input type required by the stack factory
 * @template R - The resource map returned by the stack factory
 *
 * @param factory - A stack factory created via `defineStack`, containing the name and creation logic
 * @param input - The input object to pass into the stack's factory function
 *
 * @returns A `Stack` instance that is ready to be used by the Kubricate CLI or programmatic consumers.
 *
 * @example
 * ```ts
 * const appStack = createStack(AppStack, {
 *   name: 'nginx',
 *   image: 'nginx:latest',
 *   replicas: 2,
 * });
 *
 * appStack.useSecrets(...).deploy();
 * ```
 */
export function initStack<I, R extends Record<string, unknown>>(
  factory: StackFactory<I, R>,
  input: I
): Stack<I, R> {
  const builder = (data: I) => {
    const resources = factory.create(data);
    const composer = new ResourceComposer<R>();
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