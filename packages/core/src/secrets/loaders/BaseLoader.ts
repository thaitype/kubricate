/**
 * BaseLoader is the interface for secret loaders,
 * responsible for resolving secrets from sources such as
 * environment variables, cloud secret managers, etc.
 *
 * Loaders are read-only and should not persist data to any provider.
 */
export interface BaseLoader<Config extends object = object> {
  /**
   * Optional configuration used during initialization.
   */
  config?: Config;

  /**
   * Pre-load and validate a list of secret names.
   * Should fail fast if required secrets are missing or invalid.
   *
   * This method is required before calling `get()`.
   */
  load(names: string[]): Promise<void>;

  /**
   * Return a secret by name after it has been loaded.
   * Throws if the secret was not previously loaded via `load()`.
   */
  get(name: string): string;
}
