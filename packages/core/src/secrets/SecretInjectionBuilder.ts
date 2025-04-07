import type { BaseStack, SecretInjectionStrategy } from '../BaseStack.js';
import type { FallbackIfNever } from '../types.js';
import type { BaseProvider } from './providers/BaseProvider.js';

/**
 * Extract only the strategy types allowed for this provider
 */
type ExtractAllowedKinds<Kinds extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind']> = Extract<
  SecretInjectionStrategy,
  { kind: Kinds }
>;

/**
 * SecretInjectionBuilder provides a fluent API to define how a secret should be injected into a resource.
 * 
 * @example
 *   injector.secrets('MY_SECRET')
 *     .inject({ kind: 'env', containerIndex: 0 })
 *     .intoResource('my-deployment'); // Optional
 */

export class SecretInjectionBuilder<Kinds extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind']> {
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
    private readonly ctx: { defaultResourceId?: string; secretManagerId: number }
  ) { }

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
   * Define how this secret should be injected.
   * Enforces only allowed `kind` types based on the provider's supported kinds.
   */
  inject(strategy: FallbackIfNever<ExtractAllowedKinds<Kinds>, SecretInjectionStrategy>): this {
    this.strategy = strategy;
    return this;
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
    this.stack.registerSecretInjection(
      {
        provider: this.provider,
        resourceId,
        path,
        meta: {
          secretName: this.secretName,
          targetName: this.targetName ?? this.secretName,
        },
      },
    );
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

    const resourceId = composer.findResourceIdByKind(kind);
    if (!resourceId) {
      throw new Error(
        `[SecretInjectionBuilder] Could not resolve resourceId from provider.targetKind="${kind}".\n` +
        ` → Use .intoResource(...) to specify a resource ID explicitly,\n` +
        ` → or call setDefaultResourceId(...) in SecretsInjectionContext.`
      );
    }

    return resourceId;
  }
}
