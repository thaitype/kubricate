import { InferResourceBuilderFunction } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class KubricateStack<T extends (...args: any[]) => any> {

  controller!: ReturnType<T>;

  /**
   * Configure the stack with the provided data.
   * @param data The configuration data for the stack.
   * @returns The Kubricate Controller instance.
   */
  abstract configureStack(data: unknown): unknown;

  overrideStack(data: Partial<InferResourceBuilderFunction<T>>) {
    console.log('overriding stack', data);
    return this;
  }
}