
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
export type MergeStrategy =
  | 'overwrite'
  | 'error'
  | 'autoMerge';

/**
 * Levels where secret conflicts can occur during orchestration.
 * 
 * This corresponds directly to the keys in `ConfigConflictOptions['handleSecretConflict']`.
 */
export type MergeLevel = keyof NonNullable<ConfigConflictOptions['handleSecretConflict']>;

/**
 * Configuration for how the orchestrator should handle **secret conflict resolution**.
 *
 * ❗ Important: Synthing and Kubricate do **not** "merge secrets" by default.
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
  handleSecretConflict?: {
    /**
     * Conflict resolution for multiple secrets targeting the same Provider instance.
     *
     * Example: two keys injected into the same Kubernetes Secret manifest.
     *
     * @default 'autoMerge'
     */
    intraProvider?: MergeStrategy;

    /**
     * Conflict resolution between different Providers under the same SecretManager.
     *
     * Example: collision between EnvSecretProvider and VaultSecretProvider within a single SecretManager.
     *
     * @default 'error'
     */
    crossProvider?: MergeStrategy;

    /**
     * Conflict resolution between different SecretManagers within the same Stack.
     *
     * Example: two SecretManagers both generating a Kubernetes Secret named 'app-credentials' inside the same AppStack.
     * 
     * (Only relevant in frameworks like Kubricate; Synthing itself does not use stacks.)
     *
     * @default 'error'
     */
    intraStack?: MergeStrategy;
  };
}
