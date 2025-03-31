import type { BaseLoader } from './loaders/BaseLoader.js';
import type { BaseProvider, PreparedEffect } from './providers/BaseProvider.js';
import type { AnyKey, BaseLogger } from '../types.js';
import { validateString } from '../utils.js';

export interface SecretManagerEffect {
  name: string;
  value: string;
  effects: PreparedEffect[];
}

/**
 * SecretOptions defines the structure of a secret entry in the SecretManager.
 * It includes the name of the secret, the loader to use for loading it,
 * and the provider to use for resolving it.
 */
export interface SecretOptions<
  NewSecret extends string = string,
  Loader extends AnyKey = AnyKey,
  Provider extends AnyKey = AnyKey,
> {
  /**
   * Name of the secret to be added.
   * This name must be unique within the SecretManager instance.
   */
  name: NewSecret;
  /**
   * Loader instance to use for loading the secret.
   * If not provided, the default loader will be used.
   */
  loader?: Loader;
  /**
   * Key of a registered provider instance.
   * If not provided, the default provider will be used.
   */
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
  private _secrets: Record<string, SecretOptions> = {};
  private _providers: Record<string, BaseProvider> = {};
  private _loaders: Record<string, BaseLoader> = {};

  private _defaultProvider: keyof ProviderInstances | undefined;
  private _defaultLoader: keyof LoaderInstances | undefined;

  logger?: BaseLogger;

  constructor() {}

  /**
   * Registers a new provider instance using a valid provider name
   *
   * @param provider - The unique name of the provider (e.g., 'Kubernetes.Secret').
   * @param options - Configuration specific to the provider type.
   * @returns A SecretManager instance with the provider added.
   */
  addProvider<NewProvider extends string>(provider: NewProvider, options: BaseProvider) {
    if (this._providers[provider]) {
      throw new Error(`Provider ${provider} already exists`);
    }
    this._providers[provider] = options;
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
    this._defaultProvider = provider;
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
    if (this._loaders[loader]) {
      throw new Error(`Loader ${loader} already exists`);
    }
    this._loaders[loader] = options;
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
    this._defaultLoader = loader;
    return this as SecretManager<LoaderInstances, ProviderInstances, SecretEntries>;
  }

  /**
   * Adds a new secret to the registry and links it to an existing provider.
   *
   * @param optionsOrName - SecretOptions
   * @returns A new SecretManager instance with the secret added.
   */
  addSecret<NewSecret extends string>(
    optionsOrName: NewSecret | SecretOptions<NewSecret, keyof LoaderInstances, keyof ProviderInstances>
  ) {
    if (typeof optionsOrName === 'string') {
      if (this._secrets[optionsOrName]) {
        throw new Error(`Secret ${optionsOrName} already exists`);
      }
      this._secrets[optionsOrName] = {
        name: optionsOrName,
      };
    } else {
      if (this._secrets[optionsOrName.name]) {
        throw new Error(`Secret ${optionsOrName.name} already exists`);
      }
      this._secrets[optionsOrName.name] = optionsOrName;
    }
    return this as SecretManager<LoaderInstances, ProviderInstances, SecretEntries & Record<NewSecret, string>>;
  }

  /**
   * @interal Internal method to get the current secrets in the manager.
   * This is not intended for public use.
   *
   * @returns The current secrets in the registry.
   */

  public getSecrets() {
    return this._secrets;
  }

  /**
   * @internal Internal method to get the current providers in the manager.
   * This is not intended for public use.
   *
   * @param key - The unique name of the loader (e.g., 'EnvLoader').
   * @returns The loader instance associated with the given key.
   * @throws Error if the loader is not found.
   */
  getLoader<Config extends object = object>(key?: AnyKey): BaseLoader<Config> {
    validateString(key);
    if (!this._loaders[key]) {
      throw new Error(`Loader ${key} not found`);
    }
    return this._loaders[key] as BaseLoader<Config>;
  }

  /**
   * @internal Internal method to get the current providers in the manager.
   * This is not intended for public use.
   *
   * @param key - The unique name of the provider (e.g., 'Kubernetes.Secret').
   * @returns The provider instance associated with the given key.
   * @throws Error if the provider is not found.
   */

  getProvider<Config extends object = object>(key: AnyKey | undefined): BaseProvider<Config> {
    validateString(key);
    if (!this._providers[key]) {
      throw new Error(`Provider ${key} not found`);
    }
    return this._providers[key] as BaseProvider<Config>;
  }

  validateConfig() {
    if (Object.keys(this._loaders).length === 0) {
      throw new Error('No loaders registered');
    }
    if (Object.keys(this._providers).length === 0) {
      throw new Error('No providers registered');
    }
    if (Object.keys(this._secrets).length === 0) {
      throw new Error('No secrets registered');
    }
    if (!this._defaultProvider && Object.keys(this._providers).length > 1) {
      throw new Error('No default provider set, and multiple providers registered');
    }
    if (!this._defaultLoader && Object.keys(this._loaders).length > 1) {
      throw new Error('No default loader set, and multiple loaders registered');
    }
    if (!this._defaultProvider) {
      this._defaultProvider = Object.keys(this._providers)[0] as keyof ProviderInstances;
    }
    if (!this._defaultLoader) {
      this._defaultLoader = Object.keys(this._loaders)[0] as keyof LoaderInstances;
    }
    console.log('SecretManager configuration is valid');
    console.log('Default provider:', this._defaultProvider);
    console.log('Default loader:', this._defaultLoader);
  }

  resolveProvider(provider?: AnyKey): BaseProvider {
    return provider ? this.getProvider(provider) : this.getProvider(this._defaultProvider);
  }

  resolveLoader(loader?: AnyKey): BaseLoader {
    return loader ? this.getLoader(loader) : this.getLoader(this._defaultLoader);
  }

  getLoaders() {
    return this._loaders;
  }

  getProviders() {
    return this._providers;
  }

  getDefaultProvider() {
    return this._defaultProvider;
  }

  getDefaultLoader() {
    return this._defaultLoader;
  }

  /**
   * @internal Internal method to get the current providers in the manager.
   * This is not intended for public use.
   *
   * Prepares secrets using registered loaders and providers.
   * This does not perform any side-effects like `kubectl`.
   *
   * @returns An array of SecretManagerEffect objects, each containing the name, value, and effects of the secret.
   * @throws Error if a loader or provider is not found for a secret.
   */
  async prepare(): Promise<SecretManagerEffect[]> {
    this.validateConfig();
    const secrets = this.getSecrets();
    const resolved: Record<string, string> = {};
    const loadedKeys = new Set<string>();

    for (const secret of Object.values(secrets)) {
      const loader = this.resolveLoader(secret.loader);

      if (!loadedKeys.has(secret.name)) {
        await loader.load([secret.name]);
        resolved[secret.name] = loader.get(secret.name);
        loadedKeys.add(secret.name);
      }
    }

    return Object.values(secrets).map(secret => {
      const provider = this.resolveProvider(secret.provider);
      return {
        name: secret.name,
        value: resolved[secret.name],
        effects: provider.prepare(secret.name, resolved[secret.name]),
      };
    });
  }
}
