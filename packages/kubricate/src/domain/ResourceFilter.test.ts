import { describe, expect, it } from 'vitest';

import type { RenderedFile } from '../commands/generate/GenerateRunner.js';
import { ResourceFilter } from './ResourceFilter.js';

describe('ResourceFilter', () => {
  const createFile = (originalPath: string): RenderedFile => ({
    originalPath,
    filePath: `/${originalPath}.yaml`,
    content: `kind: Resource\nname: ${originalPath}`,
  });

  describe('filter', () => {
    it('should return all files when filters array is empty', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('db.service')];

      const result = filter.filter(files, []);

      expect(result).toEqual(files);
      expect(result).toHaveLength(2);
    });

    it('should filter by stack ID', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('app.service'), createFile('db.statefulset')];

      const result = filter.filter(files, ['app']);

      expect(result).toHaveLength(2);
      expect(result[0].originalPath).toBe('app.deployment');
      expect(result[1].originalPath).toBe('app.service');
    });

    it('should filter by full resource ID', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('app.service'), createFile('db.statefulset')];

      const result = filter.filter(files, ['app.deployment']);

      expect(result).toHaveLength(1);
      expect(result[0].originalPath).toBe('app.deployment');
    });

    it('should filter by multiple stack IDs', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('db.statefulset'), createFile('cache.deployment')];

      const result = filter.filter(files, ['app', 'cache']);

      expect(result).toHaveLength(2);
      expect(result.map(f => f.originalPath)).toEqual(['app.deployment', 'cache.deployment']);
    });

    it('should filter by multiple resource IDs', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('app.service'), createFile('db.statefulset')];

      const result = filter.filter(files, ['app.deployment', 'db.statefulset']);

      expect(result).toHaveLength(2);
      expect(result.map(f => f.originalPath)).toEqual(['app.deployment', 'db.statefulset']);
    });

    it('should filter by mix of stack IDs and resource IDs', () => {
      const filter = new ResourceFilter();
      const files = [
        createFile('app.deployment'),
        createFile('app.service'),
        createFile('db.statefulset'),
        createFile('cache.deployment'),
      ];

      const result = filter.filter(files, ['app', 'db.statefulset']);

      expect(result).toHaveLength(3);
      expect(result.map(f => f.originalPath)).toEqual(['app.deployment', 'app.service', 'db.statefulset']);
    });

    it('should throw error for non-existent filter', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment')];

      expect(() => filter.filter(files, ['nonexistent'])).toThrow(
        'The following filters did not match any resource: nonexistent'
      );
    });

    it('should throw error with available stacks and resources', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('db.service')];

      expect(() => filter.filter(files, ['invalid'])).toThrow('Available filters:');
      expect(() => filter.filter(files, ['invalid'])).toThrow('• Stacks:');
      expect(() => filter.filter(files, ['invalid'])).toThrow('• Resources:');
    });

    it('should throw error listing all unmatched filters', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment')];

      expect(() => filter.filter(files, ['invalid1', 'invalid2'])).toThrow('invalid1, invalid2');
    });

    it('should include help message in error', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment')];

      expect(() => filter.filter(files, ['invalid'])).toThrow('Please check your --filter values');
    });

    it('should list available stacks in sorted order', () => {
      const filter = new ResourceFilter();
      const files = [createFile('zebra.deployment'), createFile('apple.service'), createFile('beta.pod')];

      try {
        filter.filter(files, ['invalid']);
      } catch (error) {
        const message = (error as Error).message;
        const stacksMatch = message.match(/Stacks:[\s\S]*?(?=•|$)/);
        expect(stacksMatch).toBeTruthy();
        // Should be alphabetically sorted: apple, beta, zebra
        const stacksText = stacksMatch![0];
        const appleIndex = stacksText.indexOf('apple');
        const betaIndex = stacksText.indexOf('beta');
        const zebraIndex = stacksText.indexOf('zebra');
        expect(appleIndex).toBeLessThan(betaIndex);
        expect(betaIndex).toBeLessThan(zebraIndex);
      }
    });

    it('should list available resources in sorted order', () => {
      const filter = new ResourceFilter();
      const files = [createFile('z.deployment'), createFile('a.service'), createFile('m.pod')];

      try {
        filter.filter(files, ['invalid']);
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('a.service');
        expect(message).toContain('m.pod');
        expect(message).toContain('z.deployment');
      }
    });

    it('should not throw when all filters match', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('db.service')];

      expect(() => filter.filter(files, ['app', 'db'])).not.toThrow();
    });

    it('should handle files with multiple dots in path', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.v1.deployment'), createFile('db.prod.service')];

      // Should use first segment as stack ID
      const result = filter.filter(files, ['app']);

      expect(result).toHaveLength(1);
      expect(result[0].originalPath).toBe('app.v1.deployment');
    });

    it('should preserve file content and paths', () => {
      const filter = new ResourceFilter();
      const originalFile: RenderedFile = {
        originalPath: 'app.deployment',
        filePath: '/custom/path/app.yaml',
        content: 'apiVersion: apps/v1\nkind: Deployment',
      };

      const result = filter.filter([originalFile], ['app']);

      expect(result[0]).toEqual(originalFile);
      expect(result[0].content).toBe(originalFile.content);
      expect(result[0].filePath).toBe(originalFile.filePath);
    });
  });

  describe('getFilterInfo', () => {
    it('should return empty sets for empty filters', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment')];

      const result = filter.getFilterInfo(files, []);

      expect(result.files).toEqual(files);
      expect(result.stackIds.size).toBe(0);
      expect(result.resourceIds.size).toBe(0);
      expect(result.matchedFilters.size).toBe(0);
    });

    it('should return all stack IDs', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('db.service'), createFile('cache.pod')];

      const result = filter.getFilterInfo(files, ['app']);

      expect(result.stackIds).toEqual(new Set(['app', 'db', 'cache']));
    });

    it('should return all resource IDs', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('app.service')];

      const result = filter.getFilterInfo(files, ['app']);

      expect(result.resourceIds).toEqual(new Set(['app.deployment', 'app.service']));
    });

    it('should return matched filters for stack ID', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment')];

      const result = filter.getFilterInfo(files, ['app']);

      expect(result.matchedFilters).toEqual(new Set(['app']));
    });

    it('should return matched filters for resource ID', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('app.service')];

      const result = filter.getFilterInfo(files, ['app.deployment']);

      expect(result.matchedFilters).toEqual(new Set(['app.deployment']));
    });

    it('should return filtered files', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('db.service')];

      const result = filter.getFilterInfo(files, ['app']);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].originalPath).toBe('app.deployment');
    });

    it('should track multiple matched filters', () => {
      const filter = new ResourceFilter();
      const files = [createFile('app.deployment'), createFile('app.service'), createFile('db.statefulset')];

      const result = filter.getFilterInfo(files, ['app', 'db.statefulset']);

      expect(result.matchedFilters).toEqual(new Set(['app', 'db.statefulset']));
    });
  });
});
