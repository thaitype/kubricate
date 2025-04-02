import { BaseStack } from './BaseStack.js';
import type { ResourceComposer } from './ResourceComposer.js';

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
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function createStack<Data, Entries extends Record<string, unknown> = {}>(
  name: string,
  builder: ConfigureComposerFunction<Data, Entries>
) {
  const stack = new GenericStack<Data, Entries>(builder);
  stack.setName(name);
  return stack;
}
