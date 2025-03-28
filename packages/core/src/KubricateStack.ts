export abstract class KubricateStack {

  /**
   * Configure the stack with the provided data.
   * @param data The configuration data for the stack.
   * @returns The Kubricate Controller instance.
   */
  abstract configureStack(data: unknown): unknown;
}