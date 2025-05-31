import type { ResourceComposer } from './ResourceComposer.js';

import { BaseStack } from './BaseStack.js';

export type ConfigureComposerFunction<Data, Entries extends Record<string, unknown>> = (
  data: Data
) => ResourceComposer<Entries>;

// Generic stack class that holds builder function internally
export class GenericStack<Data, Entries extends Record<string, unknown>> extends BaseStack<
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
 * @deprecated This function is deprecated and will be removed in the future. Use `initStack` instead.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function createStack<Data, Entries extends Record<string, unknown> = {}>(
  name: string,
  builder: ConfigureComposerFunction<Data, Entries>
) {
  return {
    from(data: Data) {
      const stack = new GenericStack<Data, Entries>(builder);
      stack.setName(name);
      return stack.from(data);
    },
  };
}
