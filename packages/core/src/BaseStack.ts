import { ResourceComposer } from './ResourceComposer.js';
import type { AnyKey, BaseLogger, FunctionLike, InferConfigureComposerFunc } from './types.js';
import type { AnySecretManager, EnvOptions, ExtractSecretManager } from './secrets/types.js';
import {
  SecretsInjectionContext,
  type BaseLoader,
  type BaseProvider,
  type ProviderInjection,
} from './secrets/index.js';
import type { Objects, Call } from 'hotscript';

export type SecretInjectionStrategy =
  | { kind: 'env'; containerIndex?: number }
  | { kind: 'volume'; mountPath: string; containerIndex?: number }
  | { kind: 'annotation' }
  | { kind: 'imagePullSecret' }
  | { kind: 'envFrom'; containerIndex?: number }
  | { kind: 'custom'; strategy: string; args: unknown[] };

export interface NewProviderInjection {
  secretRef: string;
  strategy: SecretInjectionStrategy;
  resourceId: string;
}

export interface UseSecretsOptions<Key extends AnyKey> {
  env?: EnvOptions<Key>[];
  injectes?: ProviderInjection[];
}

export type SecretManagerId = number;

/**
 * BaseStack is the base class for all stacks.
 *
 * @note BaseStack fields and methods need to be public, type inference is not working with private fields when using with `createSt`
 */
export abstract class BaseStack<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ConfigureComposerFunc extends FunctionLike<any[], ResourceComposer> = FunctionLike<any, ResourceComposer>,
  SecretManager extends AnySecretManager = AnySecretManager,
> {
  public _composer!: ReturnType<ConfigureComposerFunc>;
  public _secretManagers: Record<SecretManagerId, SecretManager> = [];
  public _targetInjects: Record<SecretManagerId, ProviderInjection[]> = [];
  public readonly _defaultSecretManagerId = 'default';
  public logger?: BaseLogger;

  public _secretContext?: SecretsInjectionContext;
  // public _secretInjects: NewProviderInjection[] = [];
  /**
   * The name of the stack.
   * This is used to identify the stack, generally used with GenericStack.
   */
  public _name?: string;
  /**
   * Registers a secret injection to be processed during stack build/render.
   */
  registerSecretInjection(inject: ProviderInjection, secretManagerId: SecretManagerId): void {
    if (!this._targetInjects[secretManagerId]) {
      this._targetInjects[secretManagerId] = [];
    }
    this._targetInjects[secretManagerId].push(inject);
  }

  /**
   * Retrieves all registered secret injections.
   */
  getTargetInjects(): Record<SecretManagerId, ProviderInjection[]> {
    return this._targetInjects;
  }

  getSecretContext(): SecretsInjectionContext | undefined {
    return this._secretContext;
  }

  /**
   * @deprecated consider to mirgate to the new builder-style API, the second argument is a function that will be called with the SecretsInjectionContext
   */
  useSecrets<NewSecretManager extends AnySecretManager>(
    secretManager: NewSecretManager,
    options: UseSecretsOptions<keyof ExtractSecretManager<NewSecretManager>['secretEntries']>
  ): this;

  useSecrets<NewSecretManager extends AnySecretManager>(
    secretManager: NewSecretManager,
    builder: (injector: SecretsInjectionContext) => void
  ): this;

  useSecrets<NewSecretManager extends AnySecretManager>(
    secretManager: NewSecretManager,
    secondArg:
      | UseSecretsOptions<keyof ExtractSecretManager<NewSecretManager>['secretEntries']>
      | ((injector: SecretsInjectionContext) => void)
  ): this {
    if (!secretManager) {
      throw new Error(`Cannot BaseStack.useSecrets, secret manager is not provided.`);
    }

    const secretManagerNextId = Object.keys(this._secretManagers).length;
    this._secretManagers[secretManagerNextId] = secretManager as unknown as SecretManager;

    if (typeof secondArg === 'function') {
      // ✨ New builder-style API
      const ctx = new SecretsInjectionContext(this, secretManager, secretManagerNextId);
      this._secretContext = ctx;
      secondArg(ctx); // invoke builder
      return this;
    }

    // 🧩 Existing object-mode API
    if (!secondArg.env) {
      throw new Error(
        `Cannot BaseStack.useSecrets, secret manager with ID ${secretManagerNextId} requires env options.`
      );
    }

    this._targetInjects[secretManagerNextId] = secondArg.injectes ?? [];
    return this;
  }

  /**
   * Custom JSON serializer for BaseStack.
   *
   * We explicitly exclude `_secretContext` because it contains a circular reference:
   * - `BaseStack._secretContext` references a `SecretsInjectionContext`
   * - which holds a back-reference to the original `BaseStack`
   *
   * This would otherwise cause `JSON.stringify()` to throw a `TypeError`.
   *
   * This method ensures safe serialization for debugging, logging, or diffing.
   */
  toJSON() {
    const clone = { ...this };
    delete clone._secretContext;
    return clone;
  }

  /**
   * Set the target injects for the secret manager in all providers
   * @param secretManagerId
   * @param injectes
   */
  setTargetInjects(secretManagerId: number) {
    if (!this._secretManagers[secretManagerId]) {
      throw new Error(`Cannot BaseStack.setTargetInjects, secret manager with ID "${secretManagerId}" is not defined.`);
    }
    this.logger?.debug(
      `BaseStack.setTargetInjects: Starting to set injectes for secret manager with ID "${secretManagerId}".`
    );
    const secretManager = this._secretManagers[secretManagerId];
    for (const provider of Object.values(secretManager.getProviders())) {
      provider.setInjects(this._targetInjects[secretManagerId]);
      if (this.logger?.debug) {
        const stringifyInjects =
          this._targetInjects[secretManagerId] ?? [].map(inject => JSON.stringify(inject)).join('\n  ');
        this.logger?.debug(
          `BaseStack.setTargetInjects: Provider "${provider.constructor.name}" injects set for secret manager with ID "${secretManagerId}": \n  "${stringifyInjects}" `
        );
      }
    }
  }

  /**
   * Get the secret manager instance.
   * @param id The ID of the secret manager. defaults to 'default'.
   * @returns The secret manager instance.
   */
  getSecretManager(id: number) {
    if (!this._secretManagers[id]) {
      throw new Error(
        `Secret manager with ID ${id} is not defined. Make sure to use the 'useSecrets' method to define it, and call before 'from' method in the stack.`
      );
    }
    return this._secretManagers[id];
  }
  /**
   * Get all secret managers in the stack.
   * @returns The secret managers in the stack.
   */
  getSecretManagers() {
    return this._secretManagers;
  }

  /**
   * Configure the stack with the provided data.
   * @param data The configuration data for the stack.
   * @returns The Kubricate Composer instance.
   */
  abstract from(data: unknown): unknown;

  override(data: Call<Objects.PartialDeep, InferConfigureComposerFunc<ConfigureComposerFunc>>) {
    this._composer.override(data);
    return this;
  }

  /**
   * Build the stack and return the resources.
   * @returns The resources in the stack.
   */
  build() {
    this.logger?.debug('BaseStack.build: Starting to build the stack.');
    this.logger?.debug('BaseStack.build: Setup target injectes for secret managers.');
    for (const secretManagerId of Object.keys(this._secretManagers)) {
      // Convert secretManagerId to number
      this.setTargetInjects(Number(secretManagerId));
      this.logger?.debug(`BaseStack.build: Target injectes for secret manager with ID ${secretManagerId} set.`);
    }

    this.logger?.debug('BaseStack.build: Injecting secrets into providers.');
    for (const secretManager of Object.values(this._secretManagers)) {
      for (const provider of Object.values(secretManager.getProviders())) {
        for (const inject of provider.injectes) {
          const targetValue = provider.getInjectionPayload();
          this._composer.inject(inject.resourceId, inject.path, targetValue);
        }
      }
    }

    return this._composer.build();
  }

  public setComposer(composer: ReturnType<ConfigureComposerFunc>) {
    this._composer = composer;
  }

  getComposer() {
    return this._composer;
  }

  /**
   * Get the resources from the composer.
   * @returns The resources from the composer.
   */
  get resources() {
    return this._composer;
  }

  getName() {
    return this._name;
  }

  setName(name: string) {
    this._name = name;
  }

  /**
   * @internal
   * This method is used to inject the logger into the stack.
   * It is called by the orchestrator to inject the logger into all components of the stack.
   *
   * Inject a logger instance into all components of the stack e.g. secret managers, loader, providers, etc.
   * This is useful for logging purposes and debugging.
   * @param logger The logger instance to be injected.
   */
  injectLogger(logger: BaseLogger) {
    this.logger = logger;

    if (typeof this.getSecretManagers === 'function') {
      const managers = this.getSecretManagers();

      for (const secretManager of Object.values(managers)) {
        // Inject into SecretManager
        secretManager.logger = logger;

        // Inject into each loader
        for (const loader of Object.values(secretManager.getLoaders())) {
          (loader as BaseLoader).logger = logger;
        }

        // Inject into each provider
        for (const provider of Object.values(secretManager.getProviders())) {
          (provider as BaseProvider).logger = logger;
        }
      }
    }
  }
}
