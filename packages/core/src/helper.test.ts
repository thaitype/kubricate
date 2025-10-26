import { describe, expect, it } from 'vitest';

import { defineStackTemplate } from './helper.js';

describe('defineStackTemplate', () => {
  it('returns a stack template with the provided name and factory', () => {
    const factory = (input: { replicas: number }) => ({
      deployment: { replicas: input.replicas },
    });

    const template = defineStackTemplate('test-stack', factory);

    expect(template.name).toBe('test-stack');
    expect(template.create).toBe(factory);
  });

  it('creates resources using the factory function', () => {
    const factory = (input: { appName: string }) => ({
      deployment: { name: input.appName },
      service: { name: `${input.appName}-svc` },
    });

    const template = defineStackTemplate('app-stack', factory);
    const resources = template.create({ appName: 'my-app' });

    expect(resources.deployment).toEqual({ name: 'my-app' });
    expect(resources.service).toEqual({ name: 'my-app-svc' });
  });

  it('works with empty input type', () => {
    const factory = () => ({
      configMap: { data: { key: 'value' } },
    });

    const template = defineStackTemplate('static-stack', factory);
    const resources = template.create(undefined);

    expect(resources.configMap).toEqual({ data: { key: 'value' } });
  });

  it('works with complex resource maps', () => {
    interface Input {
      namespace: string;
      resources: Array<{ name: string; type: string }>;
    }

    const factory = (input: Input) => {
      const resourceMap: Record<string, unknown> = {};
      input.resources.forEach((resource, index) => {
        resourceMap[`resource-${index}`] = {
          namespace: input.namespace,
          name: resource.name,
          type: resource.type,
        };
      });
      return resourceMap;
    };

    const template = defineStackTemplate<Input, Record<string, unknown>>('complex-stack', factory);
    const resources = template.create({
      namespace: 'prod',
      resources: [
        { name: 'app1', type: 'deployment' },
        { name: 'app2', type: 'service' },
      ],
    });

    expect(resources['resource-0']).toEqual({
      namespace: 'prod',
      name: 'app1',
      type: 'deployment',
    });
    expect(resources['resource-1']).toEqual({
      namespace: 'prod',
      name: 'app2',
      type: 'service',
    });
  });

  it('preserves the template structure', () => {
    const factory = (input: { value: number }) => ({ result: input.value * 2 });
    const template = defineStackTemplate('math-stack', factory);

    expect(template).toHaveProperty('name');
    expect(template).toHaveProperty('create');
    expect(Object.keys(template).sort()).toEqual(['create', 'name']);
  });
});
