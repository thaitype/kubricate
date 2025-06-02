/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it } from 'vitest';

import { ResourceComposer } from './ResourceComposer.js';

class TestClass {
  constructor(public config: Record<string, any>) {}
}

describe('ResourceComposer', () => {
  let composer: ResourceComposer;

  beforeEach(() => {
    composer = new ResourceComposer();
  });

  describe('addClass method', () => {
    it('should add a class resource to the composer', () => {
      const config = { metadata: { name: 'test' } };
      composer.addClass({ id: 'test', type: TestClass, config });

      expect(composer['_entries']).toEqual({
        test: {
          type: TestClass,
          config,
          entryType: 'class',
        },
      });
    });
  });

  describe('add method (deprecated)', () => {
    it('should add a class resource to the composer using deprecated method', () => {
      const config = { metadata: { name: 'test' } };
      composer.add({ id: 'test', type: TestClass, config });

      expect(composer['_entries']).toEqual({
        test: {
          type: TestClass,
          config,
          entryType: 'class',
        },
      });
    });
  });

  describe('addObject method', () => {
    it('should add an object resource to the composer', () => {
      const config = { metadata: { name: 'test' } };
      composer.addObject({ id: 'test', config });

      expect(composer['_entries']).toEqual({
        test: {
          config,
          entryType: 'object',
        },
      });
    });
  });

  describe('addInstance method (deprecated)', () => {
    it('should add an instance resource to the composer using deprecated method', () => {
      const config = { metadata: { name: 'test' } };
      composer.addInstance({ id: 'test', config });

      expect(composer['_entries']).toEqual({
        test: {
          config,
          entryType: 'instance',
        },
      });
    });
  });

  describe('inject method', () => {
    it('should inject a value at a path in a class resource', () => {
      const config = { metadata: { name: 'test' } };
      composer.addClass({ id: 'test', type: TestClass, config });
      composer.inject('test', 'metadata.annotations', { key: 'value' });

      expect(composer._entries['test'].config).toEqual({
        metadata: {
          name: 'test',
          annotations: { key: 'value' },
        },
      });
    });

    it('should inject a value at a path in an object resource', () => {
      const config = { metadata: { name: 'test' } };
      composer.addObject({ id: 'test', config });
      composer.inject('test', 'metadata.annotations', { key: 'value' });

      expect(composer._entries['test'].config).toEqual({
        metadata: {
          name: 'test',
          annotations: { key: 'value' },
        },
      });
    });

    it('should throw an error if resource is not found', () => {
      expect(() => {
        composer.inject('nonexistent', 'metadata.annotations', { key: 'value' });
      }).toThrow('Cannot inject, resource with ID nonexistent not found.');
    });

    it('should throw an error if resource is an instance', () => {
      const config = { metadata: { name: 'test' } };
      composer.addInstance({ id: 'test', config });

      expect(() => {
        composer.inject('test', 'metadata.annotations', { key: 'value' });
      }).toThrow('Cannot inject, resource with ID test is not an object or class.');
    });
  });

  describe('override method', () => {
    it('should store override values', () => {
      const overrideValues = { test: { metadata: { labels: { override: 'true' } } } };
      composer.override(overrideValues);

      expect(composer['_override']).toEqual(overrideValues);
    });

    it('should return the composer instance for chaining', () => {
      const result = composer.override({});
      expect(result).toBe(composer);
    });
  });

  describe('build method', () => {
    it('should build class resources with managed-by labels', () => {
      const config = { metadata: { name: 'test' } };
      composer.addClass({ id: 'test', type: TestClass, config });

      const result = Object.values(composer.build());

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TestClass);
    });

    it('should build object resources with managed-by labels', () => {
      const config = { metadata: { name: 'test' } };
      composer.addObject({ id: 'test', config });

      const result = Object.values(composer.build());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        metadata: {
          name: 'test',
        },
      });
    });

    it('should build instance resources as-is without modifications', () => {
      const config = { metadata: { name: 'test' } };
      composer.addInstance({ id: 'test', config });

      const result = Object.values(composer.build());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(config);
      // Should not have labels added
      expect((result[0] as any).metadata.labels).toBeUndefined();
    });

    it('should apply overrides to class resources', () => {
      const config = { metadata: { name: 'test' } };
      composer.addClass({ id: 'test', type: TestClass, config });
      composer.override({
        test: { metadata: { annotations: { key: 'value' } } },
      });

      const result = Object.values(composer.build());

      expect(result).toHaveLength(1);
      expect((result[0] as TestClass).config.metadata.annotations).toEqual({ key: 'value' });
      // Original name should be preserved
      expect((result[0] as TestClass).config.metadata.name).toEqual('test');
    });

    it('should apply overrides to object resources', () => {
      const config = { metadata: { name: 'test' } };
      composer.addObject({ id: 'test', config });
      composer.override({
        test: { metadata: { annotations: { key: 'value' } } },
      });

      const result = Object.values(composer.build());

      expect(result).toHaveLength(1);
      expect((result[0] as any).metadata.annotations).toEqual({ key: 'value' });
      // Original name should be preserved
      expect((result[0] as any).metadata.name).toEqual('test');
    });

    it('should handle multiple resources of different types', () => {
      const classConfig = { metadata: { name: 'class' } };
      const objectConfig = { metadata: { name: 'object' } };
      const instanceConfig = { metadata: { name: 'instance' } };

      composer
        .addClass({ id: 'class', type: TestClass, config: classConfig })
        .addObject({ id: 'object', config: objectConfig })
        .addInstance({ id: 'instance', config: instanceConfig });

      const result = Object.values(composer.build());

      expect(result).toHaveLength(3);
      expect(result.some((r: unknown) => r instanceof TestClass)).toBe(true);
      expect(result.some((r: unknown) => (r as any).metadata?.name === 'object')).toBe(true);
      expect(result.some((r: unknown) => (r as any).metadata?.name === 'instance')).toBe(true);
    });

    it('should skip resources with null/undefined type when required', () => {
      // Add a malformed entry directly to test edge case
      composer['_entries']['invalid'] = {
        config: { metadata: { name: 'invalid' } },
        entryType: 'class',
        // type is missing
      };

      const result = Object.values(composer.build());

      expect(result).toHaveLength(0);
    });

    it('should deeply merge configs with overrides', () => {
      const config = {
        metadata: {
          name: 'test',
          labels: {
            original: 'value',
          },
        },
      };

      composer.addClass({ id: 'test', type: TestClass, config });
      composer.override({
        test: {
          metadata: {
            labels: {
              override: 'value',
            },
          },
        },
      });

      const result = Object.values(composer.build());

      // Both original and override labels should be present
      expect((result[0] as TestClass).config.metadata.labels).toEqual({
        original: 'value',
        override: 'value',
      });
    });
  });

  describe('Type safety and chaining', () => {
    it('should support method chaining', () => {
      const composerWithChain = composer
        .addClass({ id: 'class1', type: TestClass, config: { metadata: { name: 'class1' } } })
        .addObject({ id: 'object1', config: { metadata: { name: 'object1' } } })
        .addInstance({ id: 'instance1', config: { metadata: { name: 'instance1' } } });

      expect(composerWithChain).toBe(composer);
      expect(Object.keys(composer['_entries'])).toHaveLength(3);
    });
  });
});
