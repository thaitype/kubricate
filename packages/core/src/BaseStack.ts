import { ResourceComposer } from './ResourceComposer.js';
import type { AnyKey, BaseLogger, FunctionLike, InferConfigureComposerFunc } from './types.js';
import type { AnySecretManager, EnvOptions } from './secrets/types.js';
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
  | { kind: 'plugin'; action?: string; args?: unknown[]; [key: string]: unknown; };

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
  public _secretManagers: Record<SecretManagerId, SecretManager> = {};
  public _targetInjects: ProviderInjection[] = [];
  public readonly _defaultSecretManagerId = 'default';
  public logger?: BaseLogger;

  /**
   * The name of the stack.
   * This is used to identify the stack, generally used with GenericStack.
   */
  public _name?: string;
  /**
   * Registers a secret injection to be processed during stack build/render.
   */
  registerSecretInjection(inject: ProviderInjection): void {
    this._targetInjects.push(inject);
  }

  /**
   * Retrieves all registered secret injections.
   */
  getTargetInjects() {
    return this._targetInjects;
  }

  useSecrets<NewSecretManager extends AnySecretManager>(
    secretManager: NewSecretManager,
    builder: ((injector: SecretsInjectionContext<NewSecretManager>) => void)
  ): this {
    if (!secretManager) {
      throw new Error(`Cannot BaseStack.useSecrets, secret manager is not provided.`);
    }

    const secretManagerNextId = Object.keys(this._secretManagers).length;
    this._secretManagers[secretManagerNextId] = secretManager as unknown as SecretManager;

    const ctx = new SecretsInjectionContext(this, secretManager, secretManagerNextId);
    builder(ctx); // invoke builder
    ctx.resolveAll();
    return this;
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

    type InjectionKey = string;
    const injectGroups = new Map<
      InjectionKey,
      {
        providerId: string;
        provider: BaseProvider;
        resourceId: string;
        path: string;
        injects: ProviderInjection[];
      }
    >();
  
    for (const inject of this._targetInjects) {
      const key = `${inject.providerId}:${inject.resourceId}:${inject.path}`;
      if (!injectGroups.has(key)) {
        injectGroups.set(key, {
          providerId: inject.providerId,
          provider: inject.provider,
          resourceId: inject.resourceId,
          path: inject.path,
          injects: [],
        });
      }
      injectGroups.get(key)!.injects.push(inject);
    }
  
    for (const { providerId, provider, resourceId, path, injects } of injectGroups.values()) {
      const payload = provider.getInjectionPayload(injects);
  
      this.logger?.debug(`BaseStack.build: Injecting value into resource:`);
      this.logger?.debug(JSON.stringify({
        providerId,
        resourceId,
        path,
        payload
      }, null, 2));
  
      this._composer.inject(resourceId, path, payload);
  
      this.logger?.debug(
        `BaseStack.build: Injected secrets from provider "${providerId}" into resource "${resourceId}" at path "${path}".`
      );
    }
  
    return this._composer.build();

    // for (const targetInject of this._targetInjects) {
    //   const provider = targetInject.provider;
    //   const injectsForProvider = this._targetInjects.filter(i => i.provider === provider);
    //   const targetValue = provider.getInjectionPayload(injectsForProvider);
    //   this.logger?.debug(`BaseStack.build: Injecting value: ${JSON.stringify(targetValue, null, 2)}`);
    //   this._composer.inject(targetInject.resourceId, targetInject.path, targetValue);
    //   this.logger?.debug(`
    //     BaseStack.build: Injected secrets into provider "${provider.constructor.name}" with ID "${targetInject.resourceId}" at path: ${targetInject.path}.`);
    // }
    // return this._composer.build();
  }

  public setComposer(composer: ReturnType<ConfigureComposerFunc>) {
    this._composer = composer;
  }

  getComposer(): ReturnType<ConfigureComposerFunc> | undefined {
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
