import type { BaseStack, SecretInjectionStrategy } from '../BaseStack.js';
import type { FallbackIfNever } from '../types.js';
import type { BaseProvider } from './providers/BaseProvider.js';

type ExtractAllowedKinds<Kinds extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind']> = Extract<
  SecretInjectionStrategy,
  { kind: Kinds }
>;

/**
 * SecretInjectionBuilder provides a fluent API to define how a secret should be injected into a resource.
 */
export class SecretInjectionBuilder<Kinds extends SecretInjectionStrategy['kind'] = SecretInjectionStrategy['kind']> {
  private strategy?: SecretInjectionStrategy;
  private resourceIdOverride?: string;

  constructor(
    private readonly stack: BaseStack,
    private readonly secretName: string,
    private readonly provider: BaseProvider,
    private readonly ctx: { defaultResourceId?: string; secretManagerId: number }
  ) {}

  inject(strategy: FallbackIfNever<ExtractAllowedKinds<Kinds>, SecretInjectionStrategy>): this {
    this.strategy = strategy;
    return this;
  }

  intoResource(resourceId: string): this {
    this.resourceIdOverride = resourceId;
    return this;
  }

  resolveInjection(): void {
    if (!this.strategy) {
      throw new Error(`No injection strategy defined for secret: ${this.secretName}`);
    }

    const resourceId = this.resourceIdOverride ?? this.ctx.defaultResourceId;
    if (!resourceId) {
      throw new Error(`Missing resource ID for injecting secret: ${this.secretName}`);
    }
    const path = this.provider.getTargetPath(this.strategy);
    this.stack.registerSecretInjection(
      {
        provider: this.provider,
        resourceId,
        path,
      },
    );
  }
}
