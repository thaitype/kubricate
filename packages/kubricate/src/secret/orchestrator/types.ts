import type { BaseLogger } from '@kubricate/core';
import type { KubricateConfig } from '../../types.js';

export interface SecretsOrchestratorOptions {
  config: KubricateConfig;
  effectOptions: EffectsOptions;
  logger: BaseLogger;
}

export interface EffectsOptions {
  workingDir?: string;
}

/**
 * Defines how secret conflict resolution is handled at different orchestration levels.
 *
 * ⚡ Key Concept:
 * Synthing and Kubricate only detect conflicts at the **logical object graph** level — not runtime cluster conflicts.
 *
 * Conflict resolution occurs **before** output is materialized (e.g., Kubernetes manifests, GitHub matrices).
 *
 * ---
 *
 * 🎯 Available conflict strategies:
 * - `'overwrite'` — Always prefer the latest value (no error; optionally logs dropped values).
 * - `'error'` — Immediately throw an error on conflict (safe default for production).
 * - `'autoMerge'` — Shallow merge object structures if supported (fallback to latest value otherwise).
 *
 */
export type ConflictStrategy = 'overwrite' | 'error' | 'autoMerge';

/**
 * Defines the levels where secret conflicts can occur during orchestration.
 *
 * These keys correspond to fine-grained areas inside the secret graph.
 */
export type ConflictLevel = keyof NonNullable<NonNullable<ConfigConflictOptions['conflict']>['strategies']>;

/**
 * Full configuration for controlling **secret conflict handling** behavior.
 *
 * ---
 *
 * Important Behavior:
 * - **intraProvider** (default: `'autoMerge'`) allows shallow merging within the same provider resource.
 * - **crossProvider** (default: `'error'`) forbids silent collisions between different providers.
 * - **crossManager** (default: `'error'`) forbids collisions across different SecretManagers.
 *
 * Note:
 * - If stricter behavior is needed, `strict: true` will enforce all levels to `'error'` mode.
 * - Manifest-level validation (e.g., Kubernetes metadata.name conflicts) is handled separately after orchestration.
 *
 */
export interface ConfigConflictOptions {
  conflict?: {
    strategies?: {
      /**
       * Conflict resolution for multiple secrets targeting the **same provider instance**.
       *
       * Example: two environment variables injected into the same Kubernetes Secret.
       *
       * @default 'autoMerge'
       */
      intraProvider?: ConflictStrategy;

      /**
       * Conflict resolution across **different providers inside the same SecretManager**.
       *
       * Example: collision between an EnvSecretProvider and VaultSecretProvider both trying to generate the same logical resource.
       *
       * @default 'error'
       */
      crossProvider?: ConflictStrategy;

      /**
       * Conflict resolution across **different SecretManagers** inside the system.
       *
       * Example: frontendManager and backendManager both creating a Kubernetes Secret named 'app-credentials'.
       *
       * (This is mainly relevant for Kubricate where stacks manage multiple managers; Synthing stays framework-agnostic.)
       *
       * @default 'error'
       */
      crossManager?: ConflictStrategy;
    };

    /**
     * Enforces **strict conflict validation** globally across all levels.
     *
     * When enabled:
     * - All conflict levels (`intraProvider`, `crossProvider`, `crossManager`) are forcibly treated as `'error'`.
     * - Any attempt to relax conflict (e.g., `'autoMerge'`) will cause a configuration validation error.
     *
     * Recommended for production environments requiring strict secret isolation and no ambiguity in deployment artifacts.
     *
     * @default false
     */
    strict?: boolean;
  };
}
