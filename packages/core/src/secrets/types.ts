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
export type AnySecretManager = SecretManager<any, any>;

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

export type PrimitiveSecretValue = string | number | boolean | null | undefined;
/**
 * /**
 * SecretValue represents the expected format for secret values loaded by a BaseConnector
 * and consumed by a BaseProvider.
 *
 * A SecretValue can be either:
 * - A single primitive (e.g., token, password, string literal)
 * - A flat object of key-value pairs, where each value is a primitive
 *
 * All values must be serializable to string (e.g., for Kubernetes Secret encoding).
 * Nested objects, arrays, or non-serializable types are not supported.
 */
export type SecretValue = PrimitiveSecretValue | Record<string, PrimitiveSecretValue>;


export interface SecretManagerRegistrationOptions {
  /**
   * Using default secret manager for the SecretRegistry
   */
  manager?: AnySecretManager;

  /**
   * Register a secret manager from a secret registry.
   */
  registry?: SecretRegistry;
}

export type ProjectSecretOptions = SecretManagerRegistrationOptions & ConfigConflictOptions;