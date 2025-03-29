import type { SecretManager } from './SecretManager.js';

/**
 * Base structure for a provider definition.
 * Includes a `name` (unique identifier) and a `config` object for provider-specific settings.
 */
export interface ProviderBase<Name extends string = string, Config extends Record<string, unknown> = {}> {
  name: Name;
  config: Config;
}

/**
 * A generic wrapper to extract type components from a SecretManager instance.
 */
export type ExtractSecretManager<Registry extends AnySecretManager> = {
  providerDefinitions: Registry extends SecretManager<infer PD, any, any> ? PD : never;
  providerInstances: Registry extends SecretManager<any, infer PI, any> ? PI : never;
  secretEntries: Registry extends SecretManager<any, any, infer SE> ? SE : never;
};

/**
 * Represents any type of SecretManager for type extraction purposes.
 */
export type AnySecretManager = SecretManager<any, any, any>;
