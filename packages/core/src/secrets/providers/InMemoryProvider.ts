import type { BaseProvider, ProviderInjection  } from './BaseProvider.js';
import type { SecretInjectionStrategy } from '../../BaseStack.js'
import type { SecretValue } from '../types.js';
import type { CustomEffect, PreparedEffect } from './BaseProvider.js';

export interface InMemoryProviderConfig {
  name?: string;
}

type SupportedStrategies = 'env';

export class InMemoryProvider implements BaseProvider<InMemoryProviderConfig, SupportedStrategies> {
  name: string | undefined;
  injectes: ProviderInjection[] = [];
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

  prepare(name: string, value: SecretValue): PreparedEffect[] {
    return [
      {
        providerName: this.name,
        type: 'custom',
        value: {
          secretName: name,
          value,
        },
      },
    ] satisfies CustomEffect[];
  }
}
