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
        stackTemplateName: 'test-stack',
        resourceId: 'deployment',
      });

      expect(injector.inject(null as any)).toBeNull();
    });

    it('should inject kubricate label into resource', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test-stack',
        stackTemplateName: 'test-stack',
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
        stackTemplateName: 'my-stack',
        resourceId: 'my-deployment',
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const metadata = result.metadata as any;

      expect(metadata.labels[LABELS.stackId]).toBe('my-stack');
      expect(metadata.annotations[LABELS.stackName]).toBe('my-stack');
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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
        stackTemplateName: 'test',
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

  describe('template metadata injection', () => {
    it('should inject stack template metadata when provided', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackTemplateName: '@kubricate/stacks/simple-app',
        resourceId: 'deployment',
        stackTemplateMetadata: {
          version: '1.5.0',
          coreVersion: '0.22.0',
          author: 'Platform Team',
          repository: 'https://github.com/acme/stacks',
        },
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const annotations = (result.metadata as any).annotations;

      expect(annotations[LABELS.stackTemplateVersion]).toBe('1.5.0');
      expect(annotations[LABELS.stackTemplateCoreVersion]).toBe('0.22.0');
      expect(annotations[LABELS.stackTemplateAuthor]).toBe('Platform Team');
      expect(annotations[LABELS.stackTemplateRepository]).toBe('https://github.com/acme/stacks');
    });

    it('should inject all optional template metadata fields when provided', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackTemplateName: '@kubricate/stacks/simple-app',
        resourceId: 'deployment',
        stackTemplateMetadata: {
          version: '1.0.0',
          coreVersion: '0.22.0',
          author: 'Platform Team <platform@acme.com>',
          description: 'Production-ready web application with monitoring',
          homepage: 'https://docs.acme.com/stacks/simple-app',
          repository: 'https://github.com/acme/app-stacks',
        },
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const annotations = (result.metadata as any).annotations;

      expect(annotations[LABELS.stackTemplateVersion]).toBe('1.0.0');
      expect(annotations[LABELS.stackTemplateCoreVersion]).toBe('0.22.0');
      expect(annotations[LABELS.stackTemplateAuthor]).toBe('Platform Team <platform@acme.com>');
      expect(annotations[LABELS.stackTemplateDescription]).toBe('Production-ready web application with monitoring');
      expect(annotations[LABELS.stackTemplateHomepage]).toBe('https://docs.acme.com/stacks/simple-app');
      expect(annotations[LABELS.stackTemplateRepository]).toBe('https://github.com/acme/app-stacks');
    });

    it('should omit optional fields when not provided', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackTemplateName: '@kubricate/stacks/simple-app',
        resourceId: 'deployment',
        stackTemplateMetadata: {
          version: '1.0.0',
          coreVersion: '0.22.0',
          // No optional fields
        },
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const annotations = (result.metadata as any).annotations;

      // Required fields should exist
      expect(annotations[LABELS.stackTemplateVersion]).toBe('1.0.0');
      expect(annotations[LABELS.stackTemplateCoreVersion]).toBe('0.22.0');

      // Optional fields should not exist
      expect(annotations[LABELS.stackTemplateAuthor]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateDescription]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateHomepage]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateRepository]).toBeUndefined();
    });

    it('should omit individual optional fields when not provided', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackTemplateName: '@kubricate/stacks/simple-app',
        resourceId: 'deployment',
        stackTemplateMetadata: {
          version: '1.0.0',
          coreVersion: '0.22.0',
          author: 'Platform Team',
          // No description, homepage, or repository
        },
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const annotations = (result.metadata as any).annotations;

      expect(annotations[LABELS.stackTemplateVersion]).toBe('1.0.0');
      expect(annotations[LABELS.stackTemplateCoreVersion]).toBe('0.22.0');
      expect(annotations[LABELS.stackTemplateAuthor]).toBe('Platform Team');
      expect(annotations[LABELS.stackTemplateDescription]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateHomepage]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateRepository]).toBeUndefined();
    });

    it('should not inject template metadata when stackTemplateMetadata is not provided', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackTemplateName: '@kubricate/stacks/simple-app',
        resourceId: 'deployment',
        // No stackTemplateMetadata
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const annotations = (result.metadata as any).annotations;

      expect(annotations[LABELS.stackTemplateVersion]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateCoreVersion]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateAuthor]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateDescription]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateHomepage]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateRepository]).toBeUndefined();
    });

    it('should still inject stackTemplateName when stackTemplateMetadata is not provided', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackTemplateName: '@kubricate/stacks/simple-app',
        resourceId: 'deployment',
        // No stackTemplateMetadata
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const annotations = (result.metadata as any).annotations;

      // stackTemplateName should always be injected
      expect(annotations[LABELS.stackTemplateName]).toBe('@kubricate/stacks/simple-app');
    });

    it('should handle template metadata for secret type correctly', () => {
      const injector = new MetadataInjector({
        type: 'secret',
        kubricateVersion: '1.0.0',
        secretManagerId: 'secret-mgr',
        secretManagerName: 'Secret Manager',
        stackTemplateMetadata: {
          version: '1.0.0',
          coreVersion: '0.22.0',
        },
      });

      const resource = { kind: 'Secret' };
      const result = injector.inject(resource);
      const annotations = (result.metadata as any).annotations;

      // Template metadata should not be injected for secret type
      expect(annotations[LABELS.stackTemplateVersion]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateCoreVersion]).toBeUndefined();
    });

    it('should inject template metadata alongside other metadata', () => {
      const fixedDate = '2024-01-01T00:00:00.000Z';
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '2.0.0',
        stackId: 'my-stack',
        stackTemplateName: '@kubricate/stacks/simple-app',
        resourceId: 'deployment',
        managedAt: fixedDate,
        stackTemplateMetadata: {
          version: '1.5.0',
          coreVersion: '0.22.0',
          author: 'Platform Team',
        },
        inject: {
          version: true,
          managedAt: true,
          resourceHash: true,
        },
      });

      const resource = { kind: 'Deployment', spec: { replicas: 3 } };
      const result = injector.inject(resource);
      const metadata = result.metadata as any;

      // Standard labels
      expect(metadata.labels[LABELS.kubricate]).toBe('true');
      expect(metadata.labels[LABELS.stackId]).toBe('my-stack');
      expect(metadata.labels[LABELS.resourceId]).toBe('deployment');

      // Standard annotations
      expect(metadata.annotations[LABELS.stackTemplateName]).toBe('@kubricate/stacks/simple-app');
      expect(metadata.annotations[LABELS.version]).toBe('2.0.0');
      expect(metadata.annotations[LABELS.managedAt]).toBe(fixedDate);
      expect(metadata.annotations[LABELS.resourceHash]).toBeDefined();

      // Template metadata annotations
      expect(metadata.annotations[LABELS.stackTemplateVersion]).toBe('1.5.0');
      expect(metadata.annotations[LABELS.stackTemplateCoreVersion]).toBe('0.22.0');
      expect(metadata.annotations[LABELS.stackTemplateAuthor]).toBe('Platform Team');
    });

    it('should NOT inject template metadata when inject.templateMetadata is false', () => {
      const injector = new MetadataInjector({
        type: 'stack',
        kubricateVersion: '1.0.0',
        stackId: 'test',
        stackTemplateName: '@kubricate/stacks/simple-app',
        resourceId: 'deployment',
        stackTemplateMetadata: {
          version: '1.5.0',
          coreVersion: '0.22.0',
          author: 'Platform Team',
        },
        inject: {
          templateMetadata: false, // Explicitly disabled
        },
      });

      const resource = { kind: 'Deployment' };
      const result = injector.inject(resource);
      const annotations = (result.metadata as any).annotations;

      // stackTemplateName should still be injected
      expect(annotations[LABELS.stackTemplateName]).toBe('@kubricate/stacks/simple-app');

      // But template metadata should NOT be injected
      expect(annotations[LABELS.stackTemplateVersion]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateCoreVersion]).toBeUndefined();
      expect(annotations[LABELS.stackTemplateAuthor]).toBeUndefined();
    });
  });
});
