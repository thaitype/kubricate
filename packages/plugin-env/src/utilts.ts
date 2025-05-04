export function maskingValue(value: string, length = 4): string {
  length = Math.floor(length);
  if (length < 0) {
    throw new Error('Length must be a non-negative integer');
  }
  if (value.length <= length) {
    return value + '*'.repeat(length - value.length);
  }
  return value.slice(0, length) + '*'.repeat(value.length - length);
}
