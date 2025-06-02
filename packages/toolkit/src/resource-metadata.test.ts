import { describe, expect, it } from 'vitest';

import { createMetadata, resourceSuffix } from './resource-metadata.js';

describe('createMetadata', () => {
  it('should create metadata with default namespace', () => {
    const generate = createMetadata('default');
    const meta = generate('nginx', 'pod');

    expect(meta).toEqual({
      name: 'nginx-pod',
      namespace: 'default',
    });
  });

  it('should create metadata with custom namespace and suffix', () => {
    const generate = createMetadata('platform');
    const meta = generate('nginx', 'deployment');

    expect(meta).toEqual({
      name: 'nginx-deploy',
      namespace: 'platform-ns',
    });
  });

  it('should merge additional metadata', () => {
    const generate = createMetadata('infra');
    const meta = generate('redis', 'statefulSet', {
      labels: { app: 'redis' },
      annotations: { team: 'backend' },
    });

    expect(meta).toEqual({
      name: 'redis-sts',
      namespace: 'infra-ns',
      labels: { app: 'redis' },
      annotations: { team: 'backend' },
    });
  });

  it('should use correct suffixes from resourceSuffix', () => {
    const generate = createMetadata('infra');

    Object.entries(resourceSuffix).forEach(([key, suffix]) => {
      const meta = generate('test', key as keyof typeof resourceSuffix);
      expect(meta.name.endsWith(`-${suffix}`)).toBe(true);
    });
  });
});
