import type { KubricateConfig } from '../types.js';

/**
 * Result of config migration containing the migrated config and any warnings
 */
export interface ConfigMigrationResult {
  /**
   * The migrated configuration
   */
  config: KubricateConfig;

  /**
   * Warning messages about deprecated fields that were migrated
   */
  warnings: string[];
}

/**
 * ConfigMigrator handles migration of deprecated configuration fields
 * to their new equivalents.
 *
 * This is a pure class with no side effects - it doesn't log, doesn't
 * mutate input, and has no dependencies. Perfect for unit testing.
 */
export class ConfigMigrator {
  /**
   * Migrates deprecated config fields to their new equivalents.
   *
   * This is a pure function that:
   * - Takes a config object
   * - Returns a new migrated config + warnings
   * - Throws errors for invalid configurations
   * - Has zero side effects (no logging, no mutation)
   *
   * @param config - The configuration to migrate
   * @returns Migration result with new config and warnings
   * @throws Error if both 'manager' and 'registry' are defined (conflict)
   *
   * @example
   * ```typescript
   * const migrator = new ConfigMigrator();
   * const result = migrator.migrate({
   *   secret: { manager: myManager }
   * });
   *
   * // result.config.secret.secretSpec === myManager
   * // result.config.secret.manager === undefined
   * // result.warnings === ['manager' and 'registry' are deprecated...]
   * ```
   */
  migrate(config: KubricateConfig | undefined): ConfigMigrationResult {
    // Handle empty/undefined config
    if (!config) {
      return { config: {}, warnings: [] };
    }

    // If no secret config, nothing to migrate
    if (!config.secret) {
      return { config, warnings: [] };
    }

    const { secret } = config;
    const warnings: string[] = [];

    // Check for conflict: both manager and registry defined
    if (secret.manager && secret.registry) {
      throw new Error(`[config.secret] Cannot define both "manager" and "registry". Use "secretSpec" instead.`);
    }

    // Create migrated config (shallow copy to avoid mutation)
    const migratedConfig: KubricateConfig = {
      ...config,
      secret: { ...secret },
    };

    // Track if any migration happened
    let migrated = false;

    // Migrate 'manager' to 'secretSpec'
    if (secret.manager) {
      migratedConfig.secret = {
        ...migratedConfig.secret,
        secretSpec: secret.manager,
      };
      delete migratedConfig.secret.manager;
      migrated = true;
    }

    // Migrate 'registry' to 'secretSpec'
    if (secret.registry) {
      migratedConfig.secret = {
        ...migratedConfig.secret,
        secretSpec: secret.registry,
      };
      delete migratedConfig.secret.registry;
      migrated = true;
    }

    // Add deprecation warning if migration occurred
    if (migrated) {
      warnings.push(`[config.secret] 'manager' and 'registry' are deprecated. Please use 'secretSpec' instead.`);
    }

    return {
      config: migratedConfig,
      warnings,
    };
  }
}
