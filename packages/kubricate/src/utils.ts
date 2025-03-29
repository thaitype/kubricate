export function getClassName(obj: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj && typeof obj === 'object' ? (obj as any).constructor.name : 'Unknown';
}
