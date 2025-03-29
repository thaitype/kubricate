import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Service } from 'kubernetes-models/v1/Service';
import { AnySecretManager, ExtractSecretManager, KubricateController, KubricateStack } from '@kubricate/core';

export interface IAppStack<EnvSecretRef extends keyof any = string> {
  namespace: string;
  name: string;
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
  env?: EnvironmentOptions<EnvSecretRef>[];
}

export interface EnvironmentOptions<EnvSecretRef extends keyof any = string> {
  /**
   * Environment variable name
   */
  name: string;
  /**
   * Environment variable value
   */
  value?: string;
  /**
   * Environment variable value from a secret
   */
  secretRef?: EnvSecretRef;
}

function configureController(data: IAppStack) {
  const port = data.port || 80;
  const replicas = data.replicas || 1;
  const imageRegistry = data.imageRegistry || '';

  const metadata = { name: data.name };
  const labels = { app: data.name };

  return new KubricateController()
    .add({
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
                },
              ],
            },
          },
        },
      },
    })
    .add({
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

export class AppStack<SecretManager extends AnySecretManager = AnySecretManager> extends KubricateStack<typeof configureController> {
  constructor(private secretStore?: SecretManager) {
    super();
  }

  configureStack(data: IAppStack<keyof ExtractSecretManager<SecretManager>['secretEntries']>) {
    this.controller = configureController(data as IAppStack);
    return this;
  }
}
