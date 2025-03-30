import { ManifestComposer } from './ManifestComposer.js';
import type { FunctionLike, InferResourceBuilderFunction } from './types.js';
import type { AnySecretManager, EnvOptions, ExtractSecretManager } from './secrets/types.js';

export abstract class BaseStack<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends FunctionLike<any[], ManifestComposer> = FunctionLike<any, ManifestComposer>,
  SecretManager extends AnySecretManager = AnySecretManager,
> {
  private _composer!: ReturnType<T>;
  private _secretManagers: Record<string, SecretManager> = {};
  private readonly _defaultSecretManagerId = 'default';

  useSecrets<NewSecretManager extends AnySecretManager>(
    secretManager: NewSecretManager,
    options: {
      /**
       * The ID of the secret manager.
       * This is used to identify the secret manager in the stack.
       *
       * Multiple secret managers can be used in the same stack.
       *
       * @default 'default' Usually, the default secret manager is used,
       */
      id?: string;
      env?: EnvOptions<keyof ExtractSecretManager<NewSecretManager>['secretEntries']>[];
    }
  ) {
    const secretManagerId = options.id ?? this._defaultSecretManagerId;
    if (!secretManager) {
      throw new Error(`Secret manager with ID ${secretManagerId} is not defined.`);
    }
    if (this._secretManagers[secretManagerId]) {
      throw new Error(`Secret manager with ID ${secretManagerId} already exists.`);
    }
    if (!options.env) {
      throw new Error(`Secret manager with ID ${secretManagerId} requires env options.`);
    }
    // TODO: Load the secrets from the secret manager
    this._secretManagers[secretManagerId] = secretManager as unknown as SecretManager;
    return this;
  }

  /**
   * Get the secret manager instance.
   * @param id The ID of the secret manager. defaults to 'default'.
   * @returns The secret manager instance.
   */
  getSecretManager(id?: string) {
    const secretManagerId = id ?? this._defaultSecretManagerId;
    if (!this._secretManagers[secretManagerId]) {
      throw new Error(`Secret manager with ID ${secretManagerId} is not defined.`);
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

  override(data: Partial<InferResourceBuilderFunction<T>>) {
    this._composer.override(data);
    return this;
  }

  /**
   * Build the stack and return the resources.
   * @returns The resources in the stack.
   */
  build() {
    return this._composer.build();
  }

  protected setComposer(composer: ReturnType<T>) {
    this._composer = composer;
  }

  /**
   * Get the manifests from the composer.
   * @returns The manifests from the composer.
   */
  get manifests() {
    return this._composer;
  }
}
