import { describe, expect, it } from 'vitest';

import { defineStackTemplate } from './defineStackTemplate.js';

describe('defineStackTemplate', () => {
  it('returns a stack template with the provided name and build function', () => {
    const build = (input: { replicas: number }) => ({
      deployment: { replicas: input.replicas },
    });

    const template = defineStackTemplate('test-stack', build);

    expect(template.name).toBe('test-stack');
    expect(template.build).toBe(build);
  });

  it('builds resources using the build function', () => {
    const build = (input: { appName: string }) => ({
      deployment: { name: input.appName },
      service: { name: `${input.appName}-svc` },
    });

    const template = defineStackTemplate('app-stack', build);
    const resources = template.build({ appName: 'my-app' });

    expect(resources.deployment).toEqual({ name: 'my-app' });
    expect(resources.service).toEqual({ name: 'my-app-svc' });
  });

  it('works with empty input type', () => {
    const build = () => ({
      configMap: { data: { key: 'value' } },
    });

    const template = defineStackTemplate('static-stack', build);
    const resources = template.build(undefined);

    expect(resources.configMap).toEqual({ data: { key: 'value' } });
  });

  it('works with complex resource maps', () => {
    interface Input {
      namespace: string;
      resources: Array<{ name: string; type: string }>;
    }

    const build = (input: Input) => {
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

    const template = defineStackTemplate<Input, Record<string, unknown>, 'complex-stack'>('complex-stack', build);
    const resources = template.build({
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
    const build = (input: { value: number }) => ({ result: input.value * 2 });
    const template = defineStackTemplate('math-stack', build);

    expect(template).toHaveProperty('name');
    expect(template).toHaveProperty('build');
    expect(Object.keys(template).sort()).toEqual(['build', 'metadata', 'name']);
  });
});
