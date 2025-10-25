import type { BaseProvider } from '@kubricate/core';

import type { BaseStack } from '../stack/BaseStack.js';
import { SecretInjectionBuilder } from './SecretInjectionBuilder.js';
import type { SecretManager } from './SecretManager.js';
import type { AnySecretManager, ExtractSecretManager } from './types.js';

/**
 * Infers the provider key (name) that a given secret is configured to use.
 * This looks up which provider instance is associated with a specific secret entry.
 *
 * @template SM - The SecretManager type
 * @template Key - The secret name key from the secret entries
 *
 * @example
 * ```typescript
 * type MyProviderKey = InferSecretProviderKey<MySecretManager, 'databasePassword'>;
 * // Result: 'opaqueProvider' (or whatever provider is configured for that secret)
 * ```
 */
export type InferSecretProviderKey<
  SM extends AnySecretManager,
  Key extends keyof ExtractSecretManager<SM>['secretEntries'],
> = ExtractSecretManager<SM>['secretEntries'][Key] extends { provider: infer P } ? P : never;

/**
 * Extracts the supported injection strategies from a provider instance.
 * This is a lower-level utility that works directly with provider keys.
 *
 * @template SM - The SecretManager type
 * @template ProviderKey - The provider instance key
 *
 * @example
 * ```typescript
 * type Strategies = ExtractProviderStrategies<MySecretManager, 'opaqueProvider'>;
 * // Result: 'env' | 'volume' (whatever the provider supports)
 * ```
 */
export type ExtractProviderStrategies<SM extends AnySecretManager, ProviderKey> = ProviderKey extends string
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ExtractSecretManager<SM>['providerInstances'][ProviderKey] extends BaseProvider<any, infer Instance>
    ? Instance
    : never
  : never;

/**
 * Infers the available injection strategies for a given secret.
 * This combines secret-to-provider lookup with strategy extraction.
 *
 * @template SM - The SecretManager type
 * @template Key - The secret name key from the secret entries
 *
 * @example
 * ```typescript
 * type Strategies = InferSecretStrategies<MySecretManager, 'databasePassword'>;
 * // Result: 'env' | 'volume' (available strategies for this secret's provider)
 * ```
 */
export type InferSecretStrategies<
  SM extends AnySecretManager,
  Key extends keyof ExtractSecretManager<SM>['secretEntries'],
> = ExtractProviderStrategies<SM, InferSecretProviderKey<SM, Key>>;

/**
 * Extracts the supported environment keys from a provider instance.
 * This is a lower-level utility that works directly with provider keys.
 *
 * @template SM - The SecretManager type
 * @template ProviderKey - The provider instance key
 *
 * @example
 * ```typescript
 * type EnvKeys = ExtractProviderEnvKeys<MySecretManager, 'basicAuthProvider'>;
 * // Result: 'username' | 'password' (whatever the provider supports)
 * ```
 */
export type ExtractProviderEnvKeys<SM extends AnySecretManager, ProviderKey> = ProviderKey extends string
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ExtractSecretManager<SM>['providerInstances'][ProviderKey] extends BaseProvider<any, any, infer EnvKeys>
    ? EnvKeys
    : never
  : never;

/**
 * Infers the available environment keys for a given secret.
 * This combines secret-to-provider lookup with environment key extraction.
 *
 * @template SM - The SecretManager type
 * @template Key - The secret name key from the secret entries
 *
 * @example
 * ```typescript
 * type EnvKeys = InferSecretEnvKeys<MySecretManager, 'basicAuthSecret'>;
 * // Result: 'username' | 'password' (available env keys for this secret's provider)
 * ```
 */
export type InferSecretEnvKeys<
  SM extends AnySecretManager,
  Key extends keyof ExtractSecretManager<SM>['secretEntries'],
> = ExtractProviderEnvKeys<SM, InferSecretProviderKey<SM, Key>>;

/**
 * SecretsInjectionContext manages the context for injecting secrets into resources within a stack.
 * This class provides a fluent API for defining how secrets should be injected into Kubernetes resources.
 *
 * @template SM - The SecretManager type containing secret and provider configuration
 *
 * @example
 * ```typescript
 * stack.useSecrets(secretManager, (injector) => {
 *   injector.setDefaultResourceId('my-deployment');
 *   injector.secrets('databasePassword')
 *     .asEnv({ targetName: 'DB_PASSWORD' });
 * });
 * ```
 */
export class SecretsInjectionContext<SM extends SecretManager = AnySecretManager> {
  private defaultResourceId: string | undefined;
  private builders: SecretInjectionBuilder[] = [];

  constructor(
    private stack: BaseStack,
    private manager: SM,
    private secretManagerId: number
  ) {}

  /**
   * Set the default resourceId to use when no explicit resource is defined in a secret injection.
   * This allows you to omit the resource ID in subsequent secret definitions if they all target
   * the same resource.
   *
   * @param id - The resource ID to use as default (e.g., 'my-deployment')
   *
   * @example
   * ```typescript
   * injector.setDefaultResourceId('my-deployment');
   * injector.secrets('password').asEnv({ targetName: 'PASSWORD' }); // Uses 'my-deployment'
   * ```
   */
  setDefaultResourceId(id: string): void {
    this.defaultResourceId = id;
  }

  /**
   * Start defining how a secret should be injected into a Kubernetes resource.
   * This method resolves the provider for the secret and returns a fluent builder
   * for specifying the injection strategy and target.
   *
   * The method is **type-safe** and infers:
   * - Available injection strategies (e.g., 'env', 'imagePullSecret') from the provider
   * - Available environment keys (e.g., 'username', 'password') for 'env' strategy
   * - Secret names from the registered secrets in the SecretManager
   *
   * @template NewKey - The secret name key from registered secrets (autocompleted)
   * @template ProviderKinds - Inferred supported injection strategies from the provider
   * @template ProviderEnvKeys - Inferred supported env keys from the provider
   *
   * @param secretName - The name of the secret to inject (must be registered in SecretManager)
   * @returns A SecretInjectionBuilder for chaining injection configuration
   *
   * @example
   * ```typescript
   * // Basic environment variable injection
   * injector.secrets('databasePassword')
   *   .inject('env', { containerIndex: 0 });
   *
   * // With custom target name
   * injector.secrets('apiToken')
   *   .forName('API_KEY')
   *   .inject('env');
   *
   * // Auto-detect strategy (when provider supports only one kind)
   * injector.secrets('dockerCredentials')
   *   .inject(); // automatically uses 'imagePullSecret'
   *
   * // Explicit resource targeting
   * injector.secrets('secret')
   *   .inject('env')
   *   .intoResource('my-deployment');
   *
   * // Using specific env keys (type-safe with BasicAuthSecretProvider)
   * injector.secrets('basicAuth')
   *   .inject('env', { key: 'username' }); // autocomplete: 'username' | 'password'
   * ```
   */
  secrets<
    NewKey extends keyof ExtractSecretManager<SM>['secretEntries'] = keyof ExtractSecretManager<SM>['secretEntries'],
    ProviderKinds extends InferSecretStrategies<SM, NewKey> = InferSecretStrategies<SM, NewKey>,
    ProviderEnvKeys extends InferSecretEnvKeys<SM, NewKey> = InferSecretEnvKeys<SM, NewKey>,
  >(secretName: NewKey): SecretInjectionBuilder<ProviderKinds, ProviderEnvKeys> {
    const { providerInstance, providerId } = this.manager.resolveProviderFor(String(secretName));

    const builder = new SecretInjectionBuilder(this.stack, String(secretName), providerInstance, {
      defaultResourceId: this.defaultResourceId,
      secretManagerId: this.secretManagerId,
      providerId,
    });

    this.builders.push(builder);
    return builder as unknown as SecretInjectionBuilder<ProviderKinds, ProviderEnvKeys>;
  }

  /**
   * Resolves all pending secret injections and applies them to the stack resources.
   * This is called internally by the framework after the user's injection callback completes.
   * You typically don't need to call this manually.
   *
   * @internal
   */
  resolveAll(): void {
    for (const builder of this.builders) {
      builder.resolveInjection();
    }
  }
}
