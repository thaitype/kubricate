import type {
  BaseLogger,
  BaseProvider,
  PreparedEffect,
  ProviderInjection,
  SecretInjectionStrategy,
  SecretValue,
} from '@kubricate/core';
import { Base64 } from 'js-base64';
import { z } from 'zod';
import { parseZodSchema } from './utilts.js';

export const dockerRegistrySecretSchema = z.object({
  username: z.string(),
  password: z.string(),
  registry: z.string(),
});

export interface ImagePullSecretProviderConfig {
  /**
   * Name of the Kubernetes Secret.
   */
  name: string;

  /**
   * Namespace for the secret.
   * @default 'default'
   */
  namespace?: string;
}

type SupportedStrategies = 'imagePullSecret';

export class ImagePullSecretProvider
  implements BaseProvider<ImagePullSecretProviderConfig, SupportedStrategies>
{
  injectes: ProviderInjection[] = [];
  logger?: BaseLogger;
  readonly targetKind = 'Deployment';
  readonly supportedStrategies: SupportedStrategies[] = ['imagePullSecret'];

  constructor(public config: ImagePullSecretProviderConfig) {}

  setInjects(injectes: ProviderInjection[]): void {
    this.injectes = injectes;
  }

  getTargetPath(strategy: SecretInjectionStrategy): string {
    if (strategy.kind === 'imagePullSecret') {
      return `spec.template.spec.imagePullSecretSecrets`;
    }
    throw new Error(`[ImagePullSecretProvider] Unsupported injection strategy: ${strategy.kind}`);
  }

  getInjectionPayload(): Array<{ name: string }> {
    return [{ name: this.config.name }];
  }

  prepare(name: string, value: SecretValue): PreparedEffect[] {
    const parsedValue = parseZodSchema(dockerRegistrySecretSchema, value);

    const dockerConfig = {
      auths: {
        [parsedValue.registry]: {
          username: parsedValue.username,
          password: parsedValue.password,
          auth: Base64.encode(`${parsedValue.username}:${parsedValue.password}`),
        },
      },
    };

    return [
      {
        type: 'kubectl',
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: this.config.name,
            namespace: this.config.namespace ?? 'default',
          },
          type: 'kubernetes.io/dockerconfigjson',
          data: {
            '.dockerconfigjson': Base64.encode(JSON.stringify(dockerConfig)),
          },
        },
      },
    ];
  }
}
