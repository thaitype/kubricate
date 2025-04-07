import type { BaseStack } from '../BaseStack.js';
import type { BaseProvider } from './providers/BaseProvider.js';
import { SecretInjectionBuilder } from './SecretInjectionBuilder.js';
import type { SecretManager } from './SecretManager.js';
import type { AnySecretManager, ExtractSecretManager } from './types.js';

export type ExtractProviderKeyFromSecretManager<
  SM extends AnySecretManager,
  Key extends keyof ExtractSecretManager<SM>['secretEntries'],
> = ExtractSecretManager<SM>['secretEntries'][Key] extends { provider: infer P } ? P : never;

export type GetProviderKindFromLoader<SM extends AnySecretManager, ProviderKey> = ProviderKey extends string
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ExtractSecretManager<SM>['providerInstances'][ProviderKey] extends BaseProvider<any, infer Instance>
  ? Instance
  : never
  : never;

export type GetProviderKinds<
  SM extends AnySecretManager,
  Key extends keyof ExtractSecretManager<SM>['secretEntries'],
> = GetProviderKindFromLoader<SM, ExtractProviderKeyFromSecretManager<SM, Key>>;

export class SecretsInjectionContext<
  SM extends SecretManager = AnySecretManager,
> {
  private defaultResourceId: string | undefined;
  private builders: SecretInjectionBuilder[] = [];

  constructor(
    private stack: BaseStack,
    private manager: SM,
    private secretManagerId: number
  ) { }

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
  secrets<
    NewKey extends keyof ExtractSecretManager<SM>['secretEntries'] = keyof ExtractSecretManager<SM>['secretEntries'],
    ProviderKinds extends GetProviderKinds<SM, NewKey> = GetProviderKinds<SM, NewKey>,
  >(secretName: NewKey): SecretInjectionBuilder<ProviderKinds> {
    const provider = this.manager.resolveProviderFor(String(secretName));

    const builder = new SecretInjectionBuilder(this.stack, String(secretName), provider, {
      defaultResourceId: this.defaultResourceId,
      secretManagerId: this.secretManagerId,
    });

    this.builders.push(builder);
    return builder as unknown as SecretInjectionBuilder<ProviderKinds>;
  }

  resolveAll(): void {
    for (const builder of this.builders) {
      builder.resolveInjection();
    }
  }
}
