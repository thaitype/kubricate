import type { AnySecretManager } from './types.js';

import { validateString } from '../internal/utils.js';

/**
 * SecretRegistry
 *
 * @description
 * Central registry to globally manage all declared SecretManager instances within a project.
 *
 * - Provides a single authoritative map of all available SecretManagers.
 * - Allows consistent conflict resolution across the entire project (not per-stack).
 * - Decouples SecretManager lifecycle from consumer frameworks (e.g., Stacks in Kubricate).
 * - Enables flexible, multi-environment setups (e.g., staging, production, DR plans).
 *
 * @remarks
 * - **Conflict detection** during secret orchestration (apply/plan) operates *only* at the registry level.
 * - **Stacks** or **consumers** simply reference SecretManagers; they are not responsible for conflict handling.
 * - Synthing and Kubricate treat the registry as the **single source of truth** for all secret orchestration workflows.
 *
 * ---
 *
 * # Example
 *
 * ```ts
 * const registry = new SecretRegistry()
 *   .register('frontend', frontendManager)
 *   .register('backend', backendManager);
 *
 * const manager = registry.get('frontend');
 * ```
 *
 *
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class SecretRegistry<SecretManagerStore extends Record<string, AnySecretManager> = {}> {
  private registry = new Map<string, AnySecretManager>();

  /**
   * Register a named SecretManager into the registry.
   *
   * @param name - Unique name for the secret manager.
   * @param manager - SecretManager instance to register.
   * @returns {SecretRegistry} for chaining
   *
   * @throws {Error} if a duplicate name is registered
   */
  add<Name extends string, NewSecretManager extends AnySecretManager>(name: Name, manager: NewSecretManager) {
    if (this.registry.has(name)) {
      throw new Error(`[SecretRegistry] Duplicate secret manager name: "${name}"`);
    }
    this.registry.set(name, manager);
    return this as unknown as SecretRegistry<SecretManagerStore & Record<Name, NewSecretManager>>;
  }

  /**
   * Retrieve a SecretManager by its registered name.
   *
   * @param name - The name of the secret manager.
   * @returns {SecretManager}
   *
   * @throws {Error} if the name is not found
   */
  get<Name extends keyof SecretManagerStore>(name: Name) {
    validateString(name);
    const manager = this.registry.get(name);
    if (!manager) {
      throw new Error(`[SecretRegistry] Secret manager not found for name: "${name}"`);
    }
    return manager as SecretManagerStore[Name];
  }

  /**
   * Return all registered secret managers as an object.
   *
   * Used internally by the orchestrator.
   */
  list(): Record<string, AnySecretManager> {
    const result: Record<string, AnySecretManager> = {};
    for (const [name, manager] of this.registry.entries()) {
      result[name] = manager;
    }
    return result;
  }

  // /**
  //  * Get the default SecretManager if exactly one is registered.
  //  *
  //  * @returns {SecretManager}
  //  *
  //  * @throws {Error} if there are zero or multiple managers
  //  */
  // getDefault(): SecretManager {
  //   const managers = Array.from(this.registry.values());
  //   if (managers.length === 1) {
  //     return managers[0];
  //   }
  //   throw new Error('[SecretRegistry] Cannot resolve default manager — multiple managers are registered.');
  // }
}
