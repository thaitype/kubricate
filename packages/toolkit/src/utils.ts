export function joinPath(...paths: string[]): string {
  return paths
    .filter(path => path !== '')
    .map(path => path.replace(/^\/|\/$/g, ''))
    .join('/');
}

/**
 * Merges metadata for Kubernetes resources.
 *
 * This function is may deprecated in the future. It should have better way to merge metadata.
 * Pull Request is accepted.
 */
export function mergeMetadata(key: 'annotations' | 'labels', input: Record<string, string>) {
  const result: Record<string, unknown> = {};
  result[key] = input;
  if (Object.keys(input).length === 0) {
    return undefined;
  }
  return result;
}
