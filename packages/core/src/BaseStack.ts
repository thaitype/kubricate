import { ResourceComposer } from './ResourceComposer.js';
import type { AnyKey, BaseLogger, FunctionLike, InferConfigureComposerFunc } from './types.js';
import type { AnySecretManager, EnvOptions, ExtractSecretManager } from './secrets/types.js';
import type { BaseLoader, BaseProvider, ProviderInjection } from './secrets/index.js';
import type { Objects, Call } from 'hotscript';

export interface UseSecretsOptions<Key extends AnyKey> {
  /**
   * The ID of the secret manager.
   * This is used to identify the secret manager in the stack.
   *
   * Multiple secret managers can be usedget in the same stack.
   *
   * @default 'default' Usually, the default secret manager is used,
   */
  id?: string;
  env?: EnvOptions<Key>[];

  injectes?: ProviderInjection[];
}

export abstract class BaseStack<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ConfigureComposerFunc extends FunctionLike<any[], ResourceComposer> = FunctionLike<any, ResourceComposer>,
  SecretManager extends AnySecretManager = AnySecretManager,
> {
  private _composer!: ReturnType<ConfigureComposerFunc>;
  private _secretManagers: Record<string, SecretManager> = {};
  private readonly _defaultSecretManagerId = 'default';
  private _targetInjects: Record<string, ProviderInjection[]> = {};
  public logger?: BaseLogger;

  useSecrets<NewSecretManager extends AnySecretManager>(
    secretManager: NewSecretManager,
    options: UseSecretsOptions<keyof ExtractSecretManager<NewSecretManager>['secretEntries']> = {}
  ) {
    const secretManagerId = options.id ?? this._defaultSecretManagerId;
    if (!secretManager) {
      throw new Error(`Cannot BaseStack.useSecrets, secret manager with ID ${secretManagerId} is not defined.`);
    }
    if (this._secretManagers[secretManagerId]) {
      throw new Error(`Cannot BaseStack.useSecrets, secret manager with ID ${secretManagerId} already exists.`);
    }
    if (!options.env) {
      throw new Error(`Cannot BaseStack.useSecrets, secret manager with ID ${secretManagerId} requires env options.`);
    }
    this.logger?.debug(`BaseStack.useSecrets: secret manager with ID ${secretManagerId} is defined.`);
    this._secretManagers[secretManagerId] = secretManager as unknown as SecretManager;

    if (this._targetInjects[secretManagerId]) {
      throw new Error(
        `Cannot BaseStack.useSecrets, secret manager with ID ${secretManagerId} already has injectes defined.`
      );
    }
    this._targetInjects[secretManagerId] = options.injectes ?? [];
    return this;
  }

  /**
   * Set the target injects for the secret manager in all providers
   * @param secretManagerId
   * @param injectes
   */
  setTargetInjects(secretManagerId: string) {
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
        const stringifyInjects = this._targetInjects[secretManagerId]
          .map(inject => JSON.stringify(inject))
          .join('\n  ');
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
  getSecretManager(id?: string) {
    const secretManagerId = id ?? this._defaultSecretManagerId;
    if (!this._secretManagers[secretManagerId]) {
      throw new Error(
        `Secret manager with ID ${secretManagerId} is not defined. Make sure to use the 'useSecrets' method to define it, and call before 'from' method in the stack.`
      );
    }
    return this._secretManagers[secretManagerId];
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
      this.setTargetInjects(secretManagerId);
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

  protected setComposer(composer: ReturnType<ConfigureComposerFunc>) {
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
