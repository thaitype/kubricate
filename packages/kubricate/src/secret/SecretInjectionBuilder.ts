import type { BaseProvider, SecretInjectionStrategy } from '@kubricate/core';

import type { BaseStack } from '../stack/BaseStack.js';
import type { FallbackIfNever } from '../types.js';

/**
 * Extract strategy options for a specific kind, enabling proper type narrowing
 */
type StrategyOptionsForKind<K extends SecretInjectionStrategy['kind'], Key extends string> = FallbackIfNever<
  Omit<Extract<SecretInjectionStrategy<Key>, { kind: K }>, 'kind'>,
  SecretInjectionStrategy<Key>
>;

/**
 * SecretInjectionBuilder provides a fluent API to define how a secret should be injected into a resource.
 *
 * @example
 *   injector.secrets('MY_SECRET')
 *     .inject({ kind: 'env', containerIndex: 0 })
 *     .intoResource('my-deployment'); // Optional
 */

export class SecretInjectionBuilder<
  Kinds extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind'],
  EnvKey extends string = string,
> {
  private strategy?: SecretInjectionStrategy;
  private resourceIdOverride?: string;
  /**
   * The injected name override (used when `.forName(...)` is called).
   *
   * This will appear in the final manifest, such as an env var name or volume mount name.
   * If not provided, the original secretName will be used.
   */
  private targetName?: string;

  constructor(
    private readonly stack: BaseStack,
    private readonly secretName: string,
    private readonly provider: BaseProvider,
    private readonly ctx: { defaultResourceId?: string; secretManagerId: number; providerId: string }
  ) {}

  /**
   * Override the name to be injected into the target manifest.
   *
   * This is useful when the name used inside the resource (e.g., env var name)
   * should differ from the registered secret name in the SecretManager.
   *
   * If not provided, the original secret name will be used.
   *
   * Example:
   *   .secrets('MY_SECRET').forName('API_KEY').inject({ kind: 'env' });
   *
   * Output:
   *   - name: API_KEY
   *     valueFrom:
   *       secretKeyRef:
   *         name: secret-application
   *         key: MY_SECRET
   *
   * @param name The name to use in the final manifest (e.g., environment variable name).
   */
  forName(name: string): this {
    this.targetName = name;
    return this;
  }

  /**
   * Define how this secret should be injected into the Kubernetes resource.
   *
   * 👉 You can call `.inject(strategy)` with a specific strategy, or use `.inject()` with no arguments
   * if the provider only supports **one** strategy kind (e.g. `'env'`).
   *
   * This method is **type-safe** and enforces allowed `kind` values per provider via TypeScript inference.
   *
   * @example
   *   // Explicit strategy:
   *   injector.secrets('APP_SECRET').inject('env', { containerIndex: 0 });
   *
   *   // Implicit (default strategy):
   *   injector.secrets('APP_SECRET').inject(); // uses first provider-supported default
   */
  inject(): this;
  inject<K extends Kinds>(kind: K, strategyOptions?: StrategyOptionsForKind<K, EnvKey>): this;

  inject<K extends Kinds>(kind?: K, strategyOptions?: StrategyOptionsForKind<K, EnvKey>): this {
    if (kind === undefined) {
      // no arguments provided
      if (this.provider.supportedStrategies.length !== 1) {
        throw new Error(
          `[SecretInjectionBuilder] inject() requires a strategy because provider supports multiple strategies: ${this.provider.supportedStrategies.join(', ')}`
        );
      }

      const defaultKind = this.provider.supportedStrategies[0];
      this.strategy = this.resolveDefaultStrategy(defaultKind);
    } else {
      this.strategy = {
        kind,
        ...strategyOptions,
      } as SecretInjectionStrategy;
    }

    return this;
  }

  /**
   * Resolves a default injection strategy based on the `kind` supported by the provider.
   * This allows `.inject()` to be used without arguments when the provider supports exactly one kind.
   *
   * Each kind has its own defaults:
   * - `env` → `{ kind: 'env', containerIndex: 0 }`
   * - `imagePullSecret` → `{ kind: 'imagePullSecret' }`
   * - `annotation` → `{ kind: 'annotation' }`
   *
   * If the kind is unsupported for defaulting, an error is thrown.
   */
  resolveDefaultStrategy(kind: SecretInjectionStrategy['kind']): SecretInjectionStrategy {
    let strategy: SecretInjectionStrategy;
    if (kind === 'env') {
      strategy = { kind: 'env', containerIndex: 0 };
    } else if (kind === 'imagePullSecret') {
      strategy = { kind: 'imagePullSecret' };
    } else if (kind === 'annotation') {
      strategy = { kind: 'annotation' };
    } else if (kind === 'envFrom') {
      strategy = { kind: 'envFrom', containerIndex: 0 };
    } else {
      throw new Error(`[SecretInjectionBuilder] inject() with no args is not implemented for kind="${kind}" yet`);
    }
    return strategy;
  }

  /**
   * Explicitly define the resource ID that defined in the composer e.g. 'my-deployment', 'my-job' to inject into.
   */
  intoResource(resourceId: string): this {
    this.resourceIdOverride = resourceId;
    return this;
  }

  /**
   * Resolve and register the final injection into the stack.
   * Should be called by SecretsInjectionContext after the injection chain ends.
   */
  resolveInjection(): void {
    if (!this.strategy) {
      throw new Error(`No injection strategy defined for secret: ${this.secretName}`);
    }
    // resolve resourceId
    const resourceId = this.resolveResourceId();
    // Get the target path for this injection
    const path = this.provider.getTargetPath(this.strategy);

    // Register the injection into the stack
    this.stack.registerSecretInjection({
      provider: this.provider,
      providerId: this.ctx.providerId,
      resourceId,
      path,
      meta: {
        secretName: this.secretName,
        targetName: this.targetName ?? this.secretName,
        strategy: this.strategy,
      },
    });
  }

  /**
   * Resolve which resource ID to inject into.
   * Priority: .intoResource(...) > setDefaultResourceId(...) > infer from provider.targetKind
   */
  private resolveResourceId(): string {
    // Determine resourceId from override
    if (this.resourceIdOverride) return this.resourceIdOverride;

    // Determine resourceId from default
    if (this.ctx.defaultResourceId) return this.ctx.defaultResourceId;

    // Auto-resolve resourceId using targetKind
    // This is the default behavior if no resourceId is provided
    const kind = this.provider.targetKind;
    const composer = this.stack.getComposer();
    if (!composer) {
      throw new Error(
        `[SecretInjectionBuilder] No resource composer found in stack. ` +
          `Make sure .from(...) is called before using .useSecrets(...)`
      );
    }

    const helperMessage =
      `Please specify a resourceId explicitly \n` +
      ` → Use .intoResource(...) to specify a resource ID explicitly,\n` +
      ` → or call setDefaultResourceId(...) in SecretsInjectionContext.`;

    const resourceId = composer.findResourceIdsByKind(kind);
    if (resourceId.length === 0) {
      throw new Error(
        `[SecretInjectionBuilder] Could not resolve resourceId from provider.targetKind="${kind}".\n` + helperMessage
      );
    } else if (resourceId.length > 1) {
      throw new Error(
        `[SecretInjectionBuilder] Multiple resourceIds found for provider.targetKind="${kind}".\n` + helperMessage
      );
    }
    return resourceId[0];
  }
}
