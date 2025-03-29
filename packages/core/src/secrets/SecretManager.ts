import type { ProviderBase } from './types.js';
/**
 * SecretManager is a type-safe registry for managing secret providers and their secrets.
 *
 * - Register provider definitions (with type-safe config).
 * - Register named provider instances based on those definitions.
 * - Add secrets referencing the registered providers.
 */
export class SecretManager<
  /**
   * Definitions of allowed provider types.
   * Each definition includes a unique `name` and its `config` structure.
   */
  ProviderDefinitions extends ProviderBase,
  /**
   * Instances of providers that have been registered.
   * Keys are provider names, values are typically unique string identifiers.
   */
  ProviderInstances extends Record<string, string> = {},
  /**
   * Secret entries added to the registry.
   * Keys are secret names, values are their associated string identifiers.
   */
  SecretEntries extends Record<string, string> = {},
> {
  /**
   * Internal runtime storage for secret values (not type-safe).
   * Intended for use in actual secret resolution or access.
   */
  private secrets: { [key: string]: string } = {};

  constructor(options?: any) {}

  /**
   * Registers a new provider instance using a valid provider name
   * from the defined ProviderDefinitions.
   *
   * @param provider - The unique name of the provider (e.g., 'Kubernetes.Secret').
   * @param options - Configuration specific to the provider type.
   * @returns A new SecretManager instance with the provider added.
   */
  addProvider<NewProvider extends ProviderDefinitions['name']>(
    provider: NewProvider,
    options?: ProviderDefinitions['config']
  ) {
    return this as SecretManager<ProviderDefinitions, ProviderInstances & Record<NewProvider, string>, SecretEntries>;
  }

  /**
   * Adds a new secret to the registry and links it to an existing provider.
   *
   * @param options - Object with:
   *   - `provider`: Key of a registered provider instance.
   *   - `name`: Name of the new secret.
   * @returns A new SecretManager instance with the secret added.
   */
  addSecret<NewSecret extends string>(options?: { provider: keyof ProviderInstances; name: NewSecret }) {
    return this as SecretManager<ProviderDefinitions, ProviderInstances, SecretEntries & Record<NewSecret, string>>;
  }
}
