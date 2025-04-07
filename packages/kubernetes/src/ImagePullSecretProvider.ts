import type {
  BaseLogger,
  BaseProvider,
  PreparedEffect,
  SecretInjectionStrategy,
  SecretOptions,
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

type SupportedStrategies = 'imagePull';

export class ImagePullSecretProvider
  implements BaseProvider<ImagePullSecretProviderConfig, SupportedStrategies>
{
  secrets: Record<string, SecretOptions> | undefined;
  logger?: BaseLogger;
  readonly targetKind = 'Deployment';
  readonly supportedStrategies: SupportedStrategies[] = ['imagePull'];

  constructor(public config: ImagePullSecretProviderConfig) {}

  setSecrets(secrets: Record<string, SecretOptions>): void {
    this.secrets = secrets;
  }

  getTargetPath(strategy: SecretInjectionStrategy): string {
    if (strategy.kind === 'imagePull') {
      return `spec.template.spec.imagePullSecrets`;
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
