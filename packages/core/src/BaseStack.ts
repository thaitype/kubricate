import { ManifestComposer } from './ManifestComposer.js';
import type { FunctionLike, InferResourceBuilderFunction } from './types.js';

export abstract class BaseStack<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends FunctionLike<any[], ManifestComposer> = FunctionLike<any, ManifestComposer>,
> {
  private composer!: ReturnType<T>;

  /**
   * Configure the stack with the provided data.
   * @param data The configuration data for the stack.
   * @returns The Kubricate Composer instance.
   */
  abstract from(data: unknown): unknown;

  override(data: Partial<InferResourceBuilderFunction<T>>) {
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

  protected setComposer(composer: ReturnType<T>) {
    this.composer = composer;
  }

  /**
   * Get the manifests from the composer.
   * @returns The manifests from the composer.
   */
  get manifests() {
    return this.composer;
  }
}
