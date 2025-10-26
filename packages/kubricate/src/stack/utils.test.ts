import { describe, expect, it } from 'vitest';

import { buildComposerFromObject } from './utils.js';

describe('buildComposerFromObject', () => {
  it('should create a ResourceComposer from an object of resources', () => {
    const resources = {
      deployment: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: 'my-app' },
      },
      service: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'my-service' },
      },
    };

    const composer = buildComposerFromObject(resources);
    const built = composer.build();

    expect(built.deployment).toEqual(resources.deployment);
    expect(built.service).toEqual(resources.service);
  });

  it('should handle empty resources object', () => {
    const resources = {};
    const composer = buildComposerFromObject(resources);
    const built = composer.build();

    expect(Object.keys(built)).toHaveLength(0);
  });

  it('should handle single resource', () => {
    const resources = {
      configMap: {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: 'config' },
        data: { key: 'value' },
      },
    };

    const composer = buildComposerFromObject(resources);
    const built = composer.build();

    expect(built.configMap).toEqual(resources.configMap);
    expect(Object.keys(built)).toHaveLength(1);
  });

  it('should preserve resource IDs', () => {
    const resources = {
      pod1: { kind: 'Pod', metadata: { name: 'pod-1' } },
      pod2: { kind: 'Pod', metadata: { name: 'pod-2' } },
      pod3: { kind: 'Pod', metadata: { name: 'pod-3' } },
    };

    const composer = buildComposerFromObject(resources);
    const built = composer.build();
    const ids = Object.keys(built);

    expect(ids).toContain('pod1');
    expect(ids).toContain('pod2');
    expect(ids).toContain('pod3');
  });

  it('should handle complex nested resource structures', () => {
    const resources = {
      statefulSet: {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: {
          name: 'database',
          labels: { app: 'db' },
        },
        spec: {
          replicas: 3,
          template: {
            spec: {
              containers: [
                {
                  name: 'postgres',
                  image: 'postgres:14',
                  env: [{ name: 'DB_NAME', value: 'mydb' }],
                },
              ],
            },
          },
        },
      },
    };

    const composer = buildComposerFromObject(resources);
    const built = composer.build();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resource = built.statefulSet as any;

    expect(resource).toEqual(resources.statefulSet);
    expect(resource.spec.replicas).toBe(3);
  });
});
