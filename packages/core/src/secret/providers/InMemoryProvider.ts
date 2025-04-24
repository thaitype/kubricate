import type { BaseProvider, ProviderInjection } from './BaseProvider.js';
import type { SecretInjectionStrategy } from '../../BaseStack.js'
import type { SecretValue } from '../types.js';
import type { CustomEffect, PreparedEffect } from './BaseProvider.js';
import { createMergeHandler } from './merge-utils.js';

export interface InMemoryProviderConfig {
  name?: string;
}

type SupportedStrategies = 'env';

export class InMemoryProvider implements BaseProvider<InMemoryProviderConfig, SupportedStrategies> {
  name: string | undefined;
  injectes: ProviderInjection[] = [];

  readonly allowMerge = true;
  readonly secretType = 'Kubricate.InMemory';

  readonly supportedStrategies: SupportedStrategies[] = ['env'];
  readonly targetKind = 'Deployment';
  public config: InMemoryProviderConfig;

  constructor(config: InMemoryProviderConfig = {}) {
    this.config = config;
  }

  setInjects(injectes: ProviderInjection[]): void {
    this.injectes = injectes;
  }

  getTargetPath(strategy: SecretInjectionStrategy): string {
    if (strategy.kind === 'env') {
      const index = strategy.containerIndex ?? 0;
      return `spec.template.spec.containers[${index}].env`;
    }
    throw new Error(`[InMemoryProvider] Unsupported strategy: ${strategy.kind}`);
  }

  getInjectionPayload(): unknown {
    return this.injectes.map(inject => ({
      name: inject.meta?.targetName,
      valueFrom: {
        secretKeyRef: {
          name: this.config.name ?? 'in-memory',
          key: inject.meta?.secretName,
        },
      },
    }));
  }

  getEffectIdentifier(effect: PreparedEffect): string {
    return effect.value?.storeName;
  }


  /**
    * Merge provider-level effects into final applyable resources.
    * Used to deduplicate (e.g. K8s secret name + ns).
    */
  mergeSecrets(effects: PreparedEffect[]): PreparedEffect[] {
    const merge = createMergeHandler();
    return merge(effects);
  }

  /**
   * Prepare the secret value for in-memory storage.
   */
  prepare(name: string, value: SecretValue): PreparedEffect[] {
    return [
      {
        secretName: name,
        providerName: this.name,
        type: 'custom',
        value: {
          storeName: this.config.name ?? 'in-memory',
          rawData: {
            [name]: value,
          },
        },
      },
    ] satisfies CustomEffect[];
  }
}
