import type { SecretManager } from './SecretManager.js';

/**
ponents from a SecretManager instance.
 */
export type ExtractSecretManager<Registry extends AnySecretManager> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loaderInstances: Registry extends SecretManager<infer LI, any, any> ? LI : never;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providerInstances: Registry extends SecretManager<any, infer PI, any> ? PI : never;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secretEntries: Registry extends SecretManager<any, any, infer SE> ? SE : never;
};

/**
 * Represents any type of SecretManager for type extraction purposes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySecretManager = SecretManager<any, any>;
