export function joinPath(...paths: string[]): string {
  return paths
    .filter(path => path !== '')
    .map(path => path.replace(/^\/|\/$/g, ''))
    .join('/');
}

export function mergeMetadata(key: 'annotations' | 'labels', input: Record<string, string>) {
  const result: Record<string, unknown> = {};
  result[key] = input;
  if (Object.keys(input).length === 0) {
    return undefined;
  }
  return result;
}
