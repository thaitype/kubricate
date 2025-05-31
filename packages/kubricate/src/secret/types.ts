import type { AnyKey } from '../types.js';
import type { ConfigConflictOptions } from './orchestrator/types.js';
import type { SecretManager } from './SecretManager.js';
import type { SecretRegistry } from './SecretRegistry.js';

/**
ponents from a SecretManager instance.
 */
export type ExtractSecretManager<Registry extends AnySecretManager> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectorInstances: Registry extends SecretManager<infer LI, any, any> ? LI : never;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providerInstances: Registry extends SecretManager<any, infer PI, any> ? PI : never;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secretEntries: Registry extends SecretManager<any, any, infer SE> ? SE : never;
};

/**
 * Represents any type of SecretManager for type extraction purposes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySecretManager = SecretManager<any, any, any, any>;

/**
 * Represents the options for environment variables in a Kubernetes deployment.
 */
export interface EnvOptions<EnvSecretRef extends AnyKey = string> {
  /**
   * Environment variable name
   */
  name: string;
  /**
   * Environment variable value
   */
  value?: string;
  /**
   * Environment variable value from a secret
   */
  secretRef?: EnvSecretRef;
}

export interface SecretManagerRegistrationOptions {
  /**
   * Using default secret manager for the SecretRegistry
   *
   * @deprecated Use `secretSpec` instead, which most support both SecretManager and SecretRegistry
   */
  manager?: AnySecretManager;

  /**
   * Register a secret manager from a secret registry.
   *
   * @deprecated Use `secretSpec` instead, which most support both SecretManager and SecretRegistry
   */
  registry?: SecretRegistry;

  /**
   * Register a secret manager or secret registry.
   */
  secretSpec?: AnySecretManager | SecretRegistry;
}

export type ProjectSecretOptions = SecretManagerRegistrationOptions & ConfigConflictOptions;
