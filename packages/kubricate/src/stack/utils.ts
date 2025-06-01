import { ResourceComposer } from './ResourceComposer.js';

export type ResourceManifest = Record<string, unknown>;

export function buildComposerFromObject<T extends Record<string, ResourceManifest>>(resources: T): ResourceComposer<T> {
  const composer = new ResourceComposer<T>();
  for (const [id, config] of Object.entries(resources)) {
    composer.addObject({ id, config });
  }
  return composer;
}
