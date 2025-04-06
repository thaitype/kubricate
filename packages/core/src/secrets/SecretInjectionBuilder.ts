import type { BaseStack, SecretInjectionStrategy } from '../BaseStack.js';
import type { BaseProvider } from './providers/BaseProvider.js';

/**
 * SecretInjectionBuilder provides a fluent API to define how a secret should be injected into a resource.
 */
export class SecretInjectionBuilder {
  private strategy?: SecretInjectionStrategy;
  private resourceIdOverride?: string;

  constructor(
    private readonly stack: BaseStack,
    private readonly secretName: string,
    private readonly provider: BaseProvider,
    private readonly ctx: { defaultResourceId?: string }
  ) {}

  inject(strategy: SecretInjectionStrategy): this {
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

    this.stack.registerSecretInjection({
      secretRef: this.secretName,
      resourceId,
      strategy: this.strategy,
    });
  }
}
