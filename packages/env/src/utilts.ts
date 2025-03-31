export function maskingValue(value: string, length = 4): string {
  return value.slice(0, length) + '*'.repeat(value.length - length);
}
