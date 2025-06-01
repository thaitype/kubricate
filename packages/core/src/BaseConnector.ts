import type { BaseLogger } from './logger.js';
import type { SecretValue } from './types.js';

/**
 * BaseConnector is the interface for secret connectors,
 * responsible for resolving secrets from sources such as
 * environment variables, cloud secret managers, etc.
 *
 * Connectors are read-only and should not persist data to any provider.
 */
export interface BaseConnector<Config extends object = object> {
  /**
   * Optional configuration used during initialization.
   */
  config: Config;

  logger?: BaseLogger;

  /**
   * Pre-load and validate a list of secret names.
   * Should fail fast if required secrets are missing or invalid.
   *
   * These names must correspond to top-level keys.
   *
   * This method is required before calling `get()`.
   */
  load(names: string[]): Promise<void>;

  /**
   * Return a secret by name after it has been loaded.
   * Throws if the secret was not previously loaded via `load()`.
   */
  get(name: string): SecretValue;

  /**
   * Set the working directory for the connector.
   * This is useful for connectors that need to read files from a specific directory.
   *
   * For example, the EnvConnector may need to read a .env file from a specific path.
   * This method is optional and may not be implemented by all connectors.
   * If not implemented, it will be a no-op.
   * @param path The path to the working directory.
   */
  setWorkingDir?(path: string | undefined): void;

  /**
   * Get the working directory for the connector.
   * This is useful for connectors that need to read files from a specific directory.
   *
   * For example, the EnvConnector may need to read a .env file from a specific path.
   * This method is optional and may not be implemented by all connectors.
   * If not implemented, it will return undefined.
   */
  getWorkingDir?(): string | undefined;
}
