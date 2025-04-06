import type { BaseStack } from '../BaseStack.js';
import { SecretInjectionBuilder } from './SecretInjectionBuilder.js';
import type { SecretManager } from './SecretManager.js';

export class SecretsInjectionContext {
  private defaultResourceId: string | undefined;
  private builders: SecretInjectionBuilder[] = [];

  constructor(
    private stack: BaseStack,
    private manager: SecretManager,
    private secretManagerId: number
  ) {}

  /**
   * Set the default resourceId to use when no explicit resource is defined in a secret injection.
   */
  setDefaultResourceId(id: string): void {
    this.defaultResourceId = id;
  }

  /**
   * Start defining how a secret will be injected into a resource.
   * This only resolves the provider, not the actual secret value.
   *
   * @param secretName - The name of the secret to inject.
   * @returns A SecretInjectionBuilder for chaining inject behavior.
   */
  secrets(secretName: string): SecretInjectionBuilder {
    const provider = this.manager.resolveProviderFor(secretName);

    const builder = new SecretInjectionBuilder(this.stack, secretName, provider, {
      defaultResourceId: this.defaultResourceId,
      secretManagerId: this.secretManagerId,
    });

    this.builders.push(builder);
    return builder;
  }

  resolveAll(): void {
    for (const builder of this.builders) {
      builder.resolveInjection();
    }
  }
}
