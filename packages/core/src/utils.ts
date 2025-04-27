/**
 * Validate Stack Id or Resource Id
 * @param input * @returns {string} - The sanitized string.
 * 
 * @ref https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set
 * The limit characters for labels is 63.
 */
export function validateId(input: string, subject = 'id'): void {
  const regex = /^[a-zA-Z0-9_-]+$/;

  if (!regex.test(input)) {
    throw new Error(
      `Invalid ${subject} "${input}". ` +
      `Only letters (a-z, A-Z), numbers (0-9), hyphens (-), and underscores (_) are allowed.`
    );
  }

  if (input.length > 63) {
    throw new Error(`Invalid ${subject} "${input}". Must not exceed 63 characters.`);
  }
}