
import type { KubricateConfig, BaseLogger } from '../../types.js';

export interface SecretsOrchestratorOptions {
  config: KubricateConfig;
  effectOptions: EffectsOptions;
  logger: BaseLogger;
}

export interface EffectsOptions {
  workingDir?: string;
}

/**
 * Defines how to resolve conflicts between secret values at different levels of the system.
 *
 * Available strategies:
 * - 'overwrite' — Always prefer the latest value (without warnings unless explicitly logged).
 * - 'error'     — Immediately throw an error when a conflict is detected (safe default).
 * - 'autoMerge' — Shallow merge object structures if possible; otherwise, prefer the latest value.
 */
export type ConflictStrategy =
  | 'overwrite'
  | 'error'
  | 'autoMerge';

/**
 * Levels where secret conflicts can occur during orchestration.
 */
export type ConflictLevel = keyof NonNullable<NonNullable<ConfigConflictOptions['conflict']>['strategies']>;

/**
 * Configuration for how the orchestrator should handle **secret conflict resolution**.
 *
 * Important: Synthing and Kubricate only auto-merge within the same provider (intraProvider) by default.
 * Cross-provider and cross-manager conflicts will error by default, ensuring strong isolation unless explicitly overridden.
 *
 * Secrets are declared independently. However, multiple secret definitions may
 * target the same logical destination (e.g., Kubernetes Secret, Vault path, output file).
 *
 * In such cases, a conflict must be handled according to the strategy defined here.
 *
 * ---
 *
 * Available conflict strategies:
 * - 'overwrite' — Last write wins (no error, may optionally log).
 * - 'error'     — Abort immediately with an error (safe for production).
 * - 'autoMerge' — Merge object values if supported; otherwise, prefer the latest.
 */
export interface ConfigConflictOptions {
  /**
  * Fine-grained control over secret conflict handling.
  *
  * If omitted, default behaviors apply.
  */
  conflict?: {
    strategies?: {
      /**
       * Conflict resolution for multiple secrets targeting the same Provider instance.
       *
       * Example: two keys injected into the same Kubernetes Secret manifest.
       *
       * @default 'autoMerge'
       */
      intraProvider?: ConflictStrategy;

      /**
       * Conflict resolution between different Providers under the same SecretManager.
       *
       * Example: collision between EnvSecretProvider and VaultSecretProvider within a single SecretManager.
       *
       * @default 'error'
       */
      crossProvider?: ConflictStrategy;

      /**
       * Conflict resolution between different SecretManagers within the same Stack.
       *
       * Example: two SecretManagers both generating a Kubernetes Secret named 'app-credentials' inside the same AppStack.
       * 
       * (Only relevant in frameworks like Kubricate; Synthing itself does not use stacks.)
       *
       * @default 'error'
       */
      intraStack?: ConflictStrategy;
    };
    /**
     * Enforce **strict conflict validation**.
     *
     * When enabled:
     * - All conflict levels are automatically treated as 'error'.
     * - Any attempt to manually relax strategies (e.g., 'autoMerge') will throw a configuration error.
     *
     * Useful for production environments that require full conflict immutability and auditability.
     *
     * @default false
     */
    strict?: boolean;
  }
}
