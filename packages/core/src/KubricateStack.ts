import { ManifestComposer } from './ManifestComposer.js';
import type { FunctionLike, InferResourceBuilderFunction } from './types.js';

export abstract class KubricateStack<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends FunctionLike<any[], ManifestComposer> = FunctionLike<any, ManifestComposer>,
> {
  composer!: ReturnType<T>;

  /**
   * Configure the stack with the provided data.
   * @param data The configuration data for the stack.
   * @returns The Kubricate Composer instance.
   */
  abstract configureStack(data: unknown): unknown;

  overrideStack(data: Partial<InferResourceBuilderFunction<T>>) {
    this.composer.override(data);
    return this;
  }

  /**
   * Build the stack and return the resources.
   * @returns The resources in the stack.
   */
  build() {
    return this.composer.build();
  }
}
