/**
 * Utility functions for type validation.
 *
 * @param value - The value to check.
 * @param type - The expected type of the value.
 * @throws TypeError if the value is not of the expected type.
 */
export function validateString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`Expected a string, but received: ${typeof value}`);
  }
}
