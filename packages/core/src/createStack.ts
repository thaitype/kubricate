import { BaseStack } from './BaseStack.js';
import type { ManifestComposer } from './ManifestComposer.js';

type ConfigureComposerFunction<Data, Entries extends Record<string, unknown>> = (
  data: Data
) => ManifestComposer<Entries>;

// Generic stack class that holds builder function internally
class GenericStack<Data, Entries extends Record<string, unknown>> extends BaseStack<
  ConfigureComposerFunction<Data, Entries>
> {
  constructor(private builder: ConfigureComposerFunction<Data, Entries>) {
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
  return new GenericStack<Data, Entries>(builder);
}
