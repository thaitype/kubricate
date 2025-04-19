import { validateString } from '../internal/utils.js';
import type { AnySecretManager } from './types.js';

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
  register<Name extends string,NewSecretManager extends AnySecretManager>(name: Name, manager: NewSecretManager) {
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
