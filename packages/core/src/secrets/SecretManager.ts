import type { BaseLoader } from './loaders/BaseLoader.js';
import type { BaseProvider } from './providers/BaseProvider.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SecretOptions<NewSecret extends string, Loader extends keyof any, Provider extends keyof any> {
  name: NewSecret;
  loader?: Loader;
  provider?: Provider;
}

/**
 * SecretManager is a type-safe registry for managing secret providers and their secrets.
 *
 * - Register provider definitions (with type-safe config).
 * - Register named provider instances based on those definitions.
 * - Add secrets referencing the registered providers.
 */
export class SecretManager<
  /**
   * Loader instances that have been registered.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  LoaderInstances extends Record<string, string> = {},
  // /**
  //  * Definitions of allowed provider types.
  //  * Each definition includes a unique `name` and its `config` structure.
  //  */
  // ProviderDefinitions extends ProviderBase,
  /**
   * Instances of providers that have been registered.
   * Keys are provider names, values are typically unique string identifiers.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ProviderInstances extends Record<string, string> = {},
  /**
   * Secret entries added to the registry.
   * Keys are secret names, values are their associated string identifiers.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  SecretEntries extends Record<string, string> = {},
> {
  /**
   * Internal runtime storage for secret values (not type-safe).
   * Intended for use in actual secret resolution or access.
   */
  private _secrets: Record<string, string> = {};
  private _providers: Record<string, string> = {};
  private _loaders: Record<string, string> = {};

  constructor() {}

  /**
   * Registers a new provider instance using a valid provider name
   *
   * @param provider - The unique name of the provider (e.g., 'Kubernetes.Secret').
   * @param options - Configuration specific to the provider type.
   * @returns A SecretManager instance with the provider added.
   */
  addProvider<NewProvider extends string>(provider: NewProvider, options: BaseProvider) {
    this._providers[provider] = '';
    console.log(`Provider ${provider} added with options:`, options);
    return this as SecretManager<LoaderInstances, ProviderInstances & Record<NewProvider, string>, SecretEntries>;
  }

  /**
   * Sets the default provider for the SecretManager.
   * This provider will be used if no specific provider is specified when adding a secret.
   *
   * Providers support multiple instances, so this is a way to set a default.
   *
   * @param provider - The unique name of the provider (e.g., 'Kubernetes.Secret').
   * @returns A SecretManager instance with the provider added.
   */
  setDefaultProvider(provider: keyof ProviderInstances) {
    console.log(`Default provider set to: ${String(provider)}`);
    return this as SecretManager<LoaderInstances, ProviderInstances, SecretEntries>;
  }

  /**
   * Adds a new loader instance using a valid loader name
   *
   * @param loader - The unique name of the loader (e.g., 'EnvLoader').
   * @param options - Configuration specific to the loader type.
   * @returns A SecretManager instance with the loader added.
   */

  addLoader<NewLoader extends string>(loader: NewLoader, options: BaseLoader) {
    console.log(`Loader ${loader} added with options:`, options);
    return this as SecretManager<LoaderInstances & Record<NewLoader, string>, ProviderInstances, SecretEntries>;
  }

  /**
   * Sets the default loader for the SecretManager.
   * This loader will be used if no specific loader is specified when adding a secret.
   *
   * Loaders support multiple instances, so this is a way to set a default.
   *
   * @param loader - The unique name of the loader (e.g., 'EnvLoader').
   * @returns A SecretManager instance with the loader added.
   */
  setDefaultLoader(loader: keyof LoaderInstances) {
    console.log(`Default loader set to: ${String(loader)}`);
    return this as SecretManager<LoaderInstances, ProviderInstances, SecretEntries>;
  }

  /**
   * Adds a new secret to the registry and links it to an existing provider.
   *
   * @param options - Object with:
   *   - `provider`: Key of a registered provider instance.
   *   - `name`: Name of the new secret.
   * @returns A new SecretManager instance with the secret added.
   */
  addSecret<NewSecret extends string>(options: SecretOptions<NewSecret, keyof LoaderInstances, keyof ProviderInstances>) {
    this._secrets[options.name] = '';
    return this as SecretManager<LoaderInstances, ProviderInstances, SecretEntries & Record<NewSecret, string>>;
  }
}
