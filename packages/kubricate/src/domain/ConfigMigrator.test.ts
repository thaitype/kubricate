/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import { ConfigMigrator } from './ConfigMigrator.js';

describe('ConfigMigrator', () => {
  describe('migrate', () => {
    it('should return empty config when input is undefined', () => {
      const migrator = new ConfigMigrator();

      const result = migrator.migrate(undefined);

      expect(result.config).toEqual({});
      expect(result.warnings).toEqual([]);
    });

    it('should return config unchanged when no secret field exists', () => {
      const migrator = new ConfigMigrator();
      const config = {
        stacks: {},
        generate: { outputDir: 'output' },
      };

      const result = migrator.migrate(config);

      expect(result.config).toEqual(config);
      expect(result.warnings).toEqual([]);
    });

    it('should migrate manager to secretSpec', () => {
      const migrator = new ConfigMigrator();
      const mockManager = { addSecret: () => {} } as any;
      const config = {
        secret: { manager: mockManager },
      };

      const result = migrator.migrate(config);

      expect(result.config.secret?.secretSpec).toBe(mockManager);
      expect(result.config.secret?.manager).toBeUndefined();
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('deprecated');
      expect(result.warnings[0]).toContain('secretSpec');
    });

    it('should migrate registry to secretSpec', () => {
      const migrator = new ConfigMigrator();
      const mockRegistry = { getManager: () => {} } as any;
      const config = {
        secret: { registry: mockRegistry },
      };

      const result = migrator.migrate(config);

      expect(result.config.secret?.secretSpec).toBe(mockRegistry);
      expect(result.config.secret?.registry).toBeUndefined();
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('deprecated');
    });

    it('should throw error when both manager and registry are defined', () => {
      const migrator = new ConfigMigrator();
      const config = {
        secret: {
          manager: { addSecret: () => {} } as any,
          registry: { getManager: () => {} } as any,
        },
      };

      expect(() => migrator.migrate(config)).toThrow('Cannot define both "manager" and "registry"');
      expect(() => migrator.migrate(config)).toThrow('secretSpec');
    });

    it('should not modify config when secretSpec is already used', () => {
      const migrator = new ConfigMigrator();
      const mockSecretSpec = { addSecret: () => {} } as any;
      const config = {
        secret: { secretSpec: mockSecretSpec },
      };

      const result = migrator.migrate(config);

      expect(result.config.secret?.secretSpec).toBe(mockSecretSpec);
      expect(result.warnings).toEqual([]);
    });

    it('should preserve other secret fields during migration', () => {
      const migrator = new ConfigMigrator();
      const mockManager = { addSecret: () => {} } as any;
      const config = {
        secret: {
          manager: mockManager,
          conflict: { strategies: { intraProvider: 'error' as const } },
        },
      };

      const result = migrator.migrate(config);

      expect(result.config.secret?.secretSpec).toBe(mockManager);
      expect(result.config.secret?.conflict?.strategies?.intraProvider).toBe('error');
      expect(result.config.secret?.manager).toBeUndefined();
    });

    it('should preserve other root config fields during migration', () => {
      const migrator = new ConfigMigrator();
      const mockManager = { addSecret: () => {} } as any;
      const config = {
        stacks: { myStack: {} as any },
        secret: { manager: mockManager },
        generate: { outputDir: 'dist' } as any,
      };

      const result = migrator.migrate(config);

      expect(result.config.stacks).toBeDefined();
      expect(result.config.generate).toBeDefined();
      expect(result.config.secret?.secretSpec).toBe(mockManager);
    });

    it('should not mutate the input config object', () => {
      const migrator = new ConfigMigrator();
      const mockManager = { addSecret: () => {} } as any;
      const config = {
        secret: { manager: mockManager },
      };

      // Create a deep copy to compare
      const originalSecretManager = config.secret.manager;

      const result = migrator.migrate(config);

      // Input config should still have manager
      expect(config.secret.manager).toBe(originalSecretManager);

      // Result should have secretSpec instead
      expect(result.config.secret?.manager).toBeUndefined();
      expect(result.config.secret?.secretSpec).toBe(mockManager);
    });

    it('should handle config with empty secret object', () => {
      const migrator = new ConfigMigrator();
      const config = {
        secret: {},
      };

      const result = migrator.migrate(config);

      expect(result.config).toEqual(config);
      expect(result.warnings).toEqual([]);
    });

    it('should generate appropriate warning message', () => {
      const migrator = new ConfigMigrator();
      const config = {
        secret: { manager: { addSecret: () => {} } as any },
      };

      const result = migrator.migrate(config);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/\[config\.secret\]/);
      expect(result.warnings[0]).toMatch(/deprecated/i);
      expect(result.warnings[0]).toContain('manager');
      expect(result.warnings[0]).toContain('registry');
      expect(result.warnings[0]).toContain('secretSpec');
    });

    it('should migrate manager field even when secretSpec exists', () => {
      const migrator = new ConfigMigrator();
      const mockManager = { addSecret: () => {} } as any;
      const existingSecretSpec = { existing: true } as any;
      const config = {
        secret: {
          manager: mockManager,
          secretSpec: existingSecretSpec,
        },
      };

      const result = migrator.migrate(config);

      // Manager should override secretSpec
      expect(result.config.secret?.secretSpec).toBe(mockManager);
      expect(result.config.secret?.manager).toBeUndefined();
    });

    it('should migrate registry field even when secretSpec exists', () => {
      const migrator = new ConfigMigrator();
      const mockRegistry = { getManager: () => {} } as any;
      const existingSecretSpec = { existing: true } as any;
      const config = {
        secret: {
          registry: mockRegistry,
          secretSpec: existingSecretSpec,
        },
      };

      const result = migrator.migrate(config);

      // Registry should override secretSpec
      expect(result.config.secret?.secretSpec).toBe(mockRegistry);
      expect(result.config.secret?.registry).toBeUndefined();
    });

    it('should handle complex config structure', () => {
      const migrator = new ConfigMigrator();
      const mockManager = { addSecret: () => {} } as any;
      const config = {
        stacks: {
          app: {} as any,
          db: {} as any,
        },
        secret: {
          manager: mockManager,
          conflict: { strategies: { intraProvider: 'autoMerge' as const } },
        },
        generate: {
          outputDir: 'k8s',
          outputMode: 'resource' as const,
        },
        metadata: {
          inject: true,
          injectManagedAt: true,
        },
      };

      const result = migrator.migrate(config);

      expect(result.config.stacks).toEqual(config.stacks);
      expect(result.config.generate).toEqual(config.generate);
      expect(result.config.metadata).toEqual(config.metadata);
      expect(result.config.secret?.secretSpec).toBe(mockManager);
      expect(result.config.secret?.conflict?.strategies?.intraProvider).toBe('autoMerge');
      expect(result.config.secret?.manager).toBeUndefined();
    });
  });
});
