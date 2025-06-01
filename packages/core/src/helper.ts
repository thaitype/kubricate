export type StackTemplate<TInput, TResourceMap> = {
  name: string;
  create: (input: TInput) => TResourceMap;
};

/**
 * Defines a stack factory that creates a stack of resources based on the provided input.
 *
 * @param name - The name of the stack.
 * @param factory - A function that takes an input and returns a map of resources.
 * @returns A stack factory function.
 */
export function defineStackTemplate<TInput, TResourceMap extends Record<string, unknown>>(
  name: string,
  factory: (input: TInput) => TResourceMap
): StackTemplate<TInput, TResourceMap> {
  return {
    name,
    create: factory,
  };
}