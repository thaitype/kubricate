import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Service } from 'kubernetes-models/v1/Service';
import { ManifestComposer, BaseStack, KubernetesSecretProvider } from '@kubricate/core';
import { IEnvVar } from 'kubernetes-models/v1/EnvVar';

export interface IAppStack {
  namespace: string;
  name: string;
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
}

function configureComposer(data: IAppStack, env: IEnvVar[]) {
  const port = data.port || 80;
  const replicas = data.replicas || 1;
  const imageRegistry = data.imageRegistry || '';

  const metadata = { name: data.name };
  const labels = { app: data.name };

  return new ManifestComposer()
    .addObject({
      id: 'namespace',
      config: {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: data.namespace,
        },
      },
    })
    .addClass({
      id: 'deployment',
      type: Deployment,
      config: {
        metadata,
        spec: {
          replicas: replicas,
          selector: {
            matchLabels: labels,
          },
          template: {
            metadata: {
              labels,
            },
            spec: {
              containers: [
                {
                  image: imageRegistry + data.name,
                  name: data.name,
                  ports: [{ containerPort: port }],
                  env,
                },
              ],
            },
          },
        },
      },
    })
    .addClass({
      id: 'service',
      type: Service,
      config: {
        metadata,
        spec: {
          selector: labels,
          type: 'ClusterIP',
          ports: [
            {
              port,
              targetPort: port,
            },
          ],
        },
      },
    });
}

export class AppStack extends BaseStack<typeof configureComposer> {
  constructor() {
    super();
  }

  /**
   * Collects environment variables from the secret manager.
   *
   * Future implementation: Support Auto Injection of SecretProvider from SecretManager into Stack,
   * So, we don't need to manually add the secret provider to the stack.
   * https://github.com/thaitype/kubricate/issues/26
   */
  collectEnvVars() {
    const secretManager = this.getSecretManager();
    const providerId = 'Kubernetes.Secret';
    const provider = secretManager.getProvider(providerId);
    if (!(provider instanceof KubernetesSecretProvider)) {
      throw new Error(`Secret provider ${providerId} is not a KubernetesSecretProvider`);
    }
    return provider.getInjectionPayload();
  }

  from(data: IAppStack) {
    const composer = configureComposer(data as IAppStack, this.collectEnvVars());
    this.setComposer(composer);
    return this;
  }
}
