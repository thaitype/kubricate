import type { BaseProvider, PreparedEffect, BaseLogger, SecretValue, BaseConnector } from '@kubricate/core';
import type { AnyKey, FallbackIfNever } from '../types.js';
import { validateString } from '../internal/utils.js';
import type { Pipe, Tuples, Unions } from 'hotscript';

export interface SecretManagerEffect {
  name: string;
  value: SecretValue;
  effects: PreparedEffect[];
}

type ExtractWithDefault<Input extends AnyKey, Default extends AnyKey> =
  Pipe<Input, [Unions.ToTuple, Tuples.At<1>]> extends undefined ? Input : Default;

// type A = ExtractWithDefault<'A' | 'B', 'C'>; // C
/**
 * SecretOptions defines the structure of a secret entry in the SecretManager.
 * It includes the name of the secret, the connector to use for loading it,
 * and the provider to use for resolving it.
 */
export interface SecretOptions<
  NewSecret extends string = string,
  Connector extends AnyKey = AnyKey,
  Provider extends AnyKey = AnyKey,
> {
  /**
   * Name of the secret to be added.
   * This name must be unique within the SecretManager instance.
   */
  name: NewSecret;
  /**
   * Connector instance to use for loading the secret.
   * If not provided, the default connector will be used.
   */
  connector?: Connector;
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
   * Connector instances that have been registered.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ConnectorInstances extends Record<string, string> = {},
  /**
   * Instances of providers that have been registered.
   * Keys are provider names, values are typically unique string identifiers.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ProviderInstances extends Record<string, BaseProvider> = {},
  /**
   * Secret entries added to the registry.
   * Keys are secret names, values are their associated string identifiers.
   */

  SecretEntries extends Record<
    string,
    {
      provider: keyof ProviderInstances;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  > = {},
  /**
   * Default provider to use if no specific provider is specified.
   */
  DefaultProvider extends AnyKey = never,
> {
  /**
   * Internal runtime storage for secret values (not type-safe).
   * Intended for use in actual secret resolution or access.
   */
  private _secrets: Record<string, SecretOptions> = {};
  private _providers: Record<string, BaseProvider> = {};
  private _connectors: Record<string, BaseConnector> = {};

  private _defaultProvider: keyof ProviderInstances | undefined;
  private _defaultConnector: keyof ConnectorInstances | undefined;

  logger?: BaseLogger;

  constructor() {}

  /**
   * Registers a new provider instance using a valid provider name
   *
   * @param provider - The unique name of the provider (e.g., 'Kubernetes.Secret').
   * @param instance - Configuration specific to the provider type.
   * @returns A SecretManager instance with the provider added.
   */
  addProvider<NewProviderKey extends string, NewProvider extends BaseProvider>(
    provider: NewProviderKey,
    instance: NewProvider
  ) {
    if (this._providers[provider]) {
      throw new Error(`Provider ${provider} already exists`);
    }
    // Set the name of the provider instance
    instance.name = provider;
    this._providers[provider] = instance;
    return this as SecretManager<
      ConnectorInstances,
      ProviderInstances & Record<NewProviderKey, NewProvider>,
      SecretEntries,
      // If the default provider is never, use the new provider key
      // Otherwise, use the existing default provider
      FallbackIfNever<DefaultProvider, NewProviderKey>
    >;
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
  setDefaultProvider<NewDefaultProvider extends keyof ProviderInstances>(provider: NewDefaultProvider) {
    this._defaultProvider = provider;
    return this as SecretManager<ConnectorInstances, ProviderInstances, SecretEntries, NewDefaultProvider>;
  }

  /**
   * Adds a new connector instance using a valid connector name
   *
   * @param connector - The unique name of the connector (e.g., 'EnvConnector').
   * @param instance - Configuration specific to the connector type.
   * @returns A SecretManager instance with the connector added.
   */

  addConnector<NewConnector extends string>(connector: NewConnector, instance: BaseConnector) {
    if (this._connectors[connector]) {
      throw new Error(`Connector ${connector} already exists`);
    }
    this._connectors[connector] = instance;
    return this as SecretManager<
      ConnectorInstances & Record<NewConnector, string>,
      ProviderInstances,
      SecretEntries,
      DefaultProvider
    >;
  }

  /**
   * Sets the default connector for the SecretManager.
   * This connector will be used if no specific connector is specified when adding a secret.
   *
   * Connectors support multiple instances, so this is a way to set a default.
   *
   * @param connector - The unique name of the connector (e.g., 'EnvConnector').
   * @returns A SecretManager instance with the connector added.
   */
  setDefaultConnector(connector: keyof ConnectorInstances) {
    this._defaultConnector = connector;
    return this as SecretManager<ConnectorInstances, ProviderInstances, SecretEntries, DefaultProvider>;
  }

  /**
   * Adds a new secret to the registry and links it to an existing provider.
   *
   * @param optionsOrName - SecretOptions
   * @returns A new SecretManager instance with the secret added.
   */
  addSecret<NewSecret extends string, NewProvider extends keyof ProviderInstances = keyof ProviderInstances>(
    optionsOrName: NewSecret | SecretOptions<NewSecret, keyof ConnectorInstances, NewProvider>
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
    return this as SecretManager<
      ConnectorInstances,
      ProviderInstances,
      SecretEntries &
        Record<
          NewSecret,
          {
            provider: ExtractWithDefault<NewProvider, DefaultProvider>;
          }
        >,
      DefaultProvider
    >;
  }

  /**
   * @interal Internal method to get the current secrets in the manager.
   * This is not intended for public use.
   *
   * @returns The current secrets in the registry.
   */

  public getSecrets() {
    // Ensure that all secrets have a provider and connector set
    // before returning the secrets.
    this.build();
    return this._secrets;
  }
  /**
   * @internal Internal method to prepare secrets for use.
   * This is not intended for public use.
   *
   * When a secret is added, it may not have a provider or connector set.
   * This method ensures that all secrets have a provider and connector set.
   */
  private prepareSecrets() {
    for (const secret of Object.values(this._secrets)) {
      if (!secret.provider) {
        secret.provider = this._defaultProvider;
      }
      if (!secret.connector) {
        secret.connector = this._defaultConnector;
      }
    }
  }

  /**
   * @internal Internal method to get the current providers in the manager.
   * This is not intended for public use.
   *
   * @param key - The unique name of the connector (e.g., 'EnvConnector').
   * @returns The connector instance associated with the given key.
   * @throws Error if the connector is not found.
   */
  getConnector<Config extends object = object>(key?: AnyKey): BaseConnector<Config> {
    validateString(key);
    if (!this._connectors[key]) {
      throw new Error(`Connector ${key} not found`);
    }
    return this._connectors[key] as BaseConnector<Config>;
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

  /**
   * @internal Internal method to build the SecretManager.
   * This is not intended for public use.
   *
   * Post processing step to ensure that all secrets is ready for use.
   */
  build() {
    if (Object.keys(this._connectors).length === 0) {
      throw new Error('No connectors registered');
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
    if (!this._defaultConnector && Object.keys(this._connectors).length > 1) {
      throw new Error('No default connector set, and multiple connectors registered');
    }
    if (!this._defaultProvider) {
      this._defaultProvider = Object.keys(this._providers)[0] as keyof ProviderInstances;
    }
    if (!this._defaultConnector) {
      this._defaultConnector = Object.keys(this._connectors)[0] as keyof ConnectorInstances;
    }
    this.prepareSecrets();
    this.logger?.debug('SecretManager[build] All secrets have a provider and connector set');
    this.logger?.debug('SecretManager[build] All configurations are valid');
    this.logger?.debug(`Default provider: ${String(this._defaultProvider)}`);
    this.logger?.debug(`Default connector: ${String(this._defaultConnector)}`);
    return this;
  }

  resolveProvider(provider?: AnyKey): BaseProvider {
    return provider ? this.getProvider(provider) : this.getProvider(this._defaultProvider);
  }

  resolveConnector(connector?: AnyKey): BaseConnector {
    return connector ? this.getConnector(connector) : this.getConnector(this._defaultConnector);
  }

  getConnectors() {
    return this._connectors;
  }

  getProviders() {
    return this._providers;
  }

  getDefaultProvider() {
    return this._defaultProvider;
  }

  getDefaultConnector() {
    return this._defaultConnector;
  }

  /**
   * @internal Internal method to get the current providers in the manager.
   * This is not intended for public use.
   *
   * Prepares secrets using registered connectors and providers.
   * This does not perform any side-effects like `kubectl`.
   *
   * @returns An array of SecretManagerEffect objects, each containing the name, value, and effects of the secret.
   * @throws Error if a connector or provider is not found for a secret.
   */
  async prepare(): Promise<SecretManagerEffect[]> {
    this.build();
    const secrets = this.getSecrets();
    const resolved: Record<string, SecretValue> = {};
    const loadedKeys = new Set<string>();

    for (const secret of Object.values(secrets)) {
      const connector = this.resolveConnector(secret.connector);

      if (!loadedKeys.has(secret.name)) {
        await connector.load([secret.name]);
        resolved[secret.name] = connector.get(secret.name);
        loadedKeys.add(secret.name);
      }
    }

    return Object.values(secrets).map(secret => {
      const provider = this.resolveProvider(secret.provider);
      return {
        name: secret.name,
        // TODO: Consider to remove the value from provider, due to only `secret apply` is using it
        value: resolved[secret.name],
        effects: provider.prepare(secret.name, resolved[secret.name]),
      };
    });
  }

  /**
   * Resolves the registered provider instance for a given secret name.
   * This method is used during the secret injection planning phase (e.g., `useSecrets`)
   * and does not resolve or load secret values.
   *
   * @param secretName - The name of the secret to resolve.
   * @returns The BaseProvider associated with the secret.
   * @throws If the secret is not registered or has no provider.
   */
  resolveProviderFor(secretName: string): {
    providerInstance: BaseProvider;
    providerId: string;
  } {
    this.build();
    const secret = this._secrets[secretName];
    if (!secret) {
      throw new Error(`Secret "${secretName}" is not registered.`);
    }
    return {
      providerInstance: this.resolveProvider(secret.provider),
      providerId: String(secret.provider),
    };
  }

  /**
   * Resolves the actual secret value and its associated provider for a given secret name.
   * This method is used at runtime when the secret is being applied (e.g., `secret apply`).
   * It loads the value from the appropriate connector and returns both the value and the provider.
   *
   * @param secretName - The name of the secret to resolve and load.
   * @returns An object containing the resolved provider and loaded secret value.
   * @throws If the secret is not registered or its connector/provider cannot be found.
   */
  async resolveSecretValueForApply(secretName: string): Promise<{
    provider: BaseProvider;
    value: SecretValue;
  }> {
    const secret = this._secrets[secretName];
    if (!secret) {
      throw new Error(`Secret "${secretName}" is not registered.`);
    }

    const connector = this.resolveConnector(secret.connector);
    await connector.load([secret.name]);
    const value = connector.get(secret.name);

    const provider = this.resolveProvider(secret.provider);
    return { provider, value };
  }
}
