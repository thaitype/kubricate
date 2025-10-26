import { describe, expect, it } from 'vitest';

import type { ResourceInfo } from './YamlRenderer.js';
import { YamlRenderer } from './YamlRenderer.js';

describe('YamlRenderer', () => {
  describe('renderToYaml', () => {
    it('should render a simple Kubernetes resource to YAML with separator', () => {
      const renderer = new YamlRenderer();
      const resource = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'my-service' },
      };

      const result = renderer.renderToYaml(resource);

      expect(result).toContain('apiVersion: v1');
      expect(result).toContain('kind: Service');
      expect(result).toContain('metadata:');
      expect(result).toContain('name: my-service');
      expect(result.endsWith('---\n')).toBe(true);
    });

    it('should render a complex nested resource', () => {
      const renderer = new YamlRenderer();
      const resource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'my-app',
          labels: { app: 'my-app', env: 'prod' },
        },
        spec: {
          replicas: 3,
          selector: { matchLabels: { app: 'my-app' } },
          template: {
            metadata: { labels: { app: 'my-app' } },
            spec: {
              containers: [
                {
                  name: 'app',
                  image: 'nginx:latest',
                  ports: [{ containerPort: 80 }],
                },
              ],
            },
          },
        },
      };

      const result = renderer.renderToYaml(resource);

      expect(result).toContain('apiVersion: apps/v1');
      expect(result).toContain('kind: Deployment');
      expect(result).toContain('replicas: 3');
      expect(result).toContain('containerPort: 80');
      expect(result.endsWith('---\n')).toBe(true);
    });

    it('should render an empty object', () => {
      const renderer = new YamlRenderer();
      const resource = {};

      const result = renderer.renderToYaml(resource);

      expect(result).toBe('{}\n---\n');
    });

    it('should render resources with array values', () => {
      const renderer = new YamlRenderer();
      const resource = {
        items: ['item1', 'item2', 'item3'],
      };

      const result = renderer.renderToYaml(resource);

      expect(result).toContain('items:');
      expect(result).toContain('- item1');
      expect(result).toContain('- item2');
      expect(result).toContain('- item3');
      expect(result.endsWith('---\n')).toBe(true);
    });

    it('should handle resources with null values', () => {
      const renderer = new YamlRenderer();
      const resource = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        data: null,
      };

      const result = renderer.renderToYaml(resource);

      expect(result).toContain('apiVersion: v1');
      expect(result).toContain('data: null');
      expect(result.endsWith('---\n')).toBe(true);
    });

    it('should handle resources with boolean values', () => {
      const renderer = new YamlRenderer();
      const resource = {
        enabled: true,
        disabled: false,
      };

      const result = renderer.renderToYaml(resource);

      expect(result).toContain('enabled: true');
      expect(result).toContain('disabled: false');
      expect(result.endsWith('---\n')).toBe(true);
    });

    it('should handle resources with number values', () => {
      const renderer = new YamlRenderer();
      const resource = {
        replicas: 3,
        port: 8080,
        cpu: 0.5,
      };

      const result = renderer.renderToYaml(resource);

      expect(result).toContain('replicas: 3');
      expect(result).toContain('port: 8080');
      expect(result).toContain('cpu: 0.5');
      expect(result.endsWith('---\n')).toBe(true);
    });

    it('should handle multi-line strings', () => {
      const renderer = new YamlRenderer();
      const resource = {
        description: 'Line 1\nLine 2\nLine 3',
      };

      const result = renderer.renderToYaml(resource);

      expect(result).toContain('description:');
      expect(result.endsWith('---\n')).toBe(true);
    });

    it('should always append document separator', () => {
      const renderer = new YamlRenderer();
      const resources = [{ kind: 'Service' }, { kind: 'Deployment' }, { kind: 'ConfigMap' }, {}];

      for (const resource of resources) {
        const result = renderer.renderToYaml(resource);
        expect(result.endsWith('---\n')).toBe(true);
      }
    });
  });

  describe('resolveOutputPath', () => {
    const createResource = (stackId: string, id: string, kind: string): ResourceInfo => ({
      stackId,
      id,
      kind,
    });

    describe('flat mode', () => {
      it('should return "stacks.yml" for all resources in flat mode', () => {
        const renderer = new YamlRenderer();
        const resources = [
          createResource('app', 'deployment', 'Deployment'),
          createResource('db', 'statefulset', 'StatefulSet'),
          createResource('cache', 'service', 'Service'),
        ];

        for (const resource of resources) {
          const result = renderer.resolveOutputPath(resource, 'flat', false);
          expect(result).toBe('stacks.yml');
        }
      });
    });

    describe('stack mode', () => {
      it('should return one file per stack', () => {
        const renderer = new YamlRenderer();

        const result1 = renderer.resolveOutputPath(createResource('app', 'deployment', 'Deployment'), 'stack', false);
        expect(result1).toBe('app.yml');

        const result2 = renderer.resolveOutputPath(createResource('db', 'statefulset', 'StatefulSet'), 'stack', false);
        expect(result2).toBe('db.yml');
      });

      it('should group multiple resources from same stack into same file', () => {
        const renderer = new YamlRenderer();
        const appResources = [
          createResource('app', 'deployment', 'Deployment'),
          createResource('app', 'service', 'Service'),
          createResource('app', 'configmap', 'ConfigMap'),
        ];

        for (const resource of appResources) {
          const result = renderer.resolveOutputPath(resource, 'stack', false);
          expect(result).toBe('app.yml');
        }
      });
    });

    describe('resource mode', () => {
      it('should return one file per resource', () => {
        const renderer = new YamlRenderer();

        const result1 = renderer.resolveOutputPath(
          createResource('app', 'deployment', 'Deployment'),
          'resource',
          false
        );
        expect(result1).toBe('app/Deployment_deployment.yml');

        const result2 = renderer.resolveOutputPath(createResource('app', 'service', 'Service'), 'resource', false);
        expect(result2).toBe('app/Service_service.yml');
      });

      it('should organize resources by stack directory', () => {
        const renderer = new YamlRenderer();

        const result1 = renderer.resolveOutputPath(
          createResource('app', 'deployment', 'Deployment'),
          'resource',
          false
        );
        expect(result1).toContain('app/');

        const result2 = renderer.resolveOutputPath(
          createResource('db', 'statefulset', 'StatefulSet'),
          'resource',
          false
        );
        expect(result2).toContain('db/');
      });

      it('should include kind and resource ID in filename', () => {
        const renderer = new YamlRenderer();

        const result = renderer.resolveOutputPath(createResource('mystack', 'myresource', 'MyKind'), 'resource', false);
        expect(result).toBe('mystack/MyKind_myresource.yml');
      });
    });

    describe('stdout mode', () => {
      it('should return canonical name when stdout is true', () => {
        const renderer = new YamlRenderer();

        const result = renderer.resolveOutputPath(createResource('app', 'deployment', 'Deployment'), 'stack', true);
        expect(result).toBe('app.deployment');
      });

      it('should use canonical name regardless of underlying mode', () => {
        const renderer = new YamlRenderer();
        const resource = createResource('app', 'deployment', 'Deployment');

        const modes: Array<'flat' | 'stack' | 'resource'> = ['flat', 'stack', 'resource'];

        for (const mode of modes) {
          const result = renderer.resolveOutputPath(resource, mode, true);
          expect(result).toBe('app.deployment');
        }
      });

      it('should create unique names for different resources', () => {
        const renderer = new YamlRenderer();

        const result1 = renderer.resolveOutputPath(createResource('app', 'deployment', 'Deployment'), 'stack', true);
        const result2 = renderer.resolveOutputPath(createResource('app', 'service', 'Service'), 'stack', true);
        const result3 = renderer.resolveOutputPath(createResource('db', 'statefulset', 'StatefulSet'), 'stack', true);

        expect(result1).toBe('app.deployment');
        expect(result2).toBe('app.service');
        expect(result3).toBe('db.statefulset');

        // All should be unique
        const results = [result1, result2, result3];
        expect(new Set(results).size).toBe(3);
      });
    });

    describe('error handling', () => {
      it('should throw error for unknown output mode', () => {
        const renderer = new YamlRenderer();
        const resource = createResource('app', 'deployment', 'Deployment');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => renderer.resolveOutputPath(resource, 'invalid' as any, false)).toThrow(
          'Unknown output mode: invalid'
        );
      });
    });

    describe('edge cases', () => {
      it('should handle stack IDs with special characters', () => {
        const renderer = new YamlRenderer();

        const result = renderer.resolveOutputPath(
          createResource('my-app-v2', 'deployment', 'Deployment'),
          'stack',
          false
        );
        expect(result).toBe('my-app-v2.yml');
      });

      it('should handle resource IDs with special characters', () => {
        const renderer = new YamlRenderer();

        const result = renderer.resolveOutputPath(
          createResource('app', 'my-deployment-v1', 'Deployment'),
          'resource',
          false
        );
        expect(result).toBe('app/Deployment_my-deployment-v1.yml');
      });

      it('should handle kinds with multiple words', () => {
        const renderer = new YamlRenderer();

        const result = renderer.resolveOutputPath(
          createResource('app', 'deployment', 'StatefulSet'),
          'resource',
          false
        );
        expect(result).toBe('app/StatefulSet_deployment.yml');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work together for a complete rendering workflow', () => {
      const renderer = new YamlRenderer();
      const resource = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'my-service' },
      };
      const resourceInfo = { stackId: 'app', id: 'service', kind: 'Service' };

      // Render to YAML
      const yaml = renderer.renderToYaml(resource);
      expect(yaml).toContain('kind: Service');
      expect(yaml.endsWith('---\n')).toBe(true);

      // Resolve paths for different modes
      const flatPath = renderer.resolveOutputPath(resourceInfo, 'flat', false);
      const stackPath = renderer.resolveOutputPath(resourceInfo, 'stack', false);
      const resourcePath = renderer.resolveOutputPath(resourceInfo, 'resource', false);
      const stdoutPath = renderer.resolveOutputPath(resourceInfo, 'stack', true);

      expect(flatPath).toBe('stacks.yml');
      expect(stackPath).toBe('app.yml');
      expect(resourcePath).toBe('app/Service_service.yml');
      expect(stdoutPath).toBe('app.service');
    });
  });
});
