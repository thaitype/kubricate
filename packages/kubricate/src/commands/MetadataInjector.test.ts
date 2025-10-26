/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import { LABELS } from './constants.js';
import { MetadataInjector } from './MetadataInjector.js';

describe('MetadataInjector', () => {
  describe('inject', () => {
    it('should return resource unchanged if not an object', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test-stack',
        stackName: 'Test Stack',
        resourceId: 'deployment',
      });

      expect(injector.inject(null as any)).toBeNull();
    });

    it('should inject kubricate label into resource', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test-stack',
        stackName: 'Test Stack',
        resourceId: 'deployment',
      });

      const resource = { kind: 'Deployment', spec: {} };
      const result = injector.inject(resource);

      expect(result.metadata).toBeDefined();
      expect((result.metadata as any).labels[LABELS.kubricate]).toBe('true');
    });

    it('should inject stack metadata when type is stack', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'my-stack',
        stackName: 'My Stack',
        resourceId: 'my-deployment',
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const metadata = result.metadata as any;

      expect(metadata.labels[LABELS.stackId]).toBe('my-stack');
      expect(metadata.annotations[LABELS.stackName]).toBe('My Stack');
      expect(metadata.labels[LABELS.resourceId]).toBe('my-deployment');
    });

    it('should inject secret metadata when type is secret', () => {
      const injector = new MetadataInjector({
        type: 'secret',
        kubricateVersion: '1.0.0',
        secretManagerId: 'secret-mgr',
        secretManagerName: 'Secret Manager',
      });

      const resource = { kind: 'Secret' };
      const result = injector.inject(resource);
      const metadata = result.metadata as any;

      expect(metadata.labels[LABELS.secretManagerId]).toBe('secret-mgr');
      expect(metadata.annotations[LABELS.secretManagerName]).toBe('Secret Manager');
    });

    it('should inject version when inject.version is true', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '2.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
        inject: { version: true },
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const metadata = result.metadata as any;

      expect(metadata.annotations[LABELS.version]).toBe('2.0.0');
    });

    it('should inject managedAt when inject.managedAt is true', () => {
      const fixedDate = '2024-01-01T00:00:00.000Z';
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
        managedAt: fixedDate,
        inject: { managedAt: true },
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const metadata = result.metadata as any;

      expect(metadata.annotations[LABELS.managedAt]).toBe(fixedDate);
    });

    it('should use current date for managedAt if not provided', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
        inject: { managedAt: true },
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const metadata = result.metadata as any;

      expect(metadata.annotations[LABELS.managedAt]).toBeDefined();
      expect(new Date(metadata.annotations[LABELS.managedAt])).toBeInstanceOf(Date);
    });

    it('should inject resourceHash when inject.resourceHash is true', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
        inject: { resourceHash: true },
      });

      const resource = { kind: 'Deployment', spec: { replicas: 3 } };
      const result = injector.inject(resource);
      const metadata = result.metadata as any;

      expect(metadata.annotations[LABELS.resourceHash]).toBeDefined();
      expect(metadata.annotations[LABELS.resourceHash]).toHaveLength(64); // SHA-256 hash
    });

    it('should create metadata object if it does not exist', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);

      expect(result.metadata).toBeDefined();
      expect((result.metadata as any).labels).toBeDefined();
      expect((result.metadata as any).annotations).toBeDefined();
    });

    it('should preserve existing metadata, labels, and annotations', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
      });

      const resource = {
        kind: 'Deployment',
        metadata: {
          name: 'my-deployment',
          labels: { app: 'myapp' },
          annotations: { note: 'important' },
        },
      };

      const result = injector.inject(resource);
      const metadata = result.metadata as any;

      expect(metadata.name).toBe('my-deployment');
      expect(metadata.labels.app).toBe('myapp');
      expect(metadata.annotations.note).toBe('important');
      expect(metadata.labels[LABELS.kubricate]).toBe('true');
    });

    it('should generate consistent hash for same resource', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
        inject: { resourceHash: true },
      });

      const resource1 = { kind: 'Deployment', spec: { replicas: 3 } };
      const resource2 = { kind: 'Deployment', spec: { replicas: 3 } };

      const result1 = injector.inject(resource1);
      const result2 = injector.inject(resource2);

      const hash1 = (result1.metadata as any).annotations[LABELS.resourceHash];
      const hash2 = (result2.metadata as any).annotations[LABELS.resourceHash];

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different resources', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
        inject: { resourceHash: true },
      });

      const resource1 = { kind: 'Deployment', spec: { replicas: 3 } };
      const resource2 = { kind: 'Deployment', spec: { replicas: 5 } };

      const result1 = injector.inject(resource1);
      const result2 = injector.inject(resource2);

      const hash1 = (result1.metadata as any).annotations[LABELS.resourceHash];
      const hash2 = (result2.metadata as any).annotations[LABELS.resourceHash];

      expect(hash1).not.toBe(hash2);
    });

    it('should ignore kubernetes runtime fields when calculating hash', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
        inject: { resourceHash: true },
      });

      const resource1 = {
        kind: 'Deployment',
        metadata: {
          creationTimestamp: '2024-01-01',
          resourceVersion: '123',
          uid: 'abc',
        },
        spec: { replicas: 3 },
      };

      const resource2 = {
        kind: 'Deployment',
        metadata: {
          creationTimestamp: '2024-12-31',
          resourceVersion: '999',
          uid: 'xyz',
        },
        spec: { replicas: 3 },
      };

      const result1 = injector.inject(resource1);
      const result2 = injector.inject(resource2);

      const hash1 = (result1.metadata as any).annotations[LABELS.resourceHash];
      const hash2 = (result2.metadata as any).annotations[LABELS.resourceHash];

      expect(hash1).toBe(hash2);
    });

    it('should sort keys consistently for hash calculation', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
        inject: { resourceHash: true },
      });

      // Same content, different key order
      const resource1 = {
        kind: 'Deployment',
        spec: { replicas: 3, selector: { app: 'test' } },
      };

      const resource2 = {
        spec: { selector: { app: 'test' }, replicas: 3 },
        kind: 'Deployment',
      };

      const result1 = injector.inject(resource1);
      const result2 = injector.inject(resource2);

      const hash1 = (result1.metadata as any).annotations[LABELS.resourceHash];
      const hash2 = (result2.metadata as any).annotations[LABELS.resourceHash];

      expect(hash1).toBe(hash2);
    });

    it('should handle arrays in hash calculation', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackName: 'Test',
        resourceId: 'res',
        inject: { resourceHash: true },
      });

      const resource = {
        kind: 'Deployment',
        spec: {
          containers: [
            { name: 'app', image: 'nginx:1.0' },
            { name: 'sidecar', image: 'proxy:1.0' },
          ],
        },
      };

      const result = injector.inject(resource);
      const hash = (result.metadata as any).annotations[LABELS.resourceHash];

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });
  });
});
