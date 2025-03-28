import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Service } from 'kubernetes-models/v1/Service';
import { KubricateController, KubricateStack } from '@kubricate/core';

export interface ISimpleAppStack {
  name: string;
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
}

function configureController(data: ISimpleAppStack) {
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

export class SimpleAppStack extends KubricateStack<typeof configureController> {
  constructor() {
    super();
  }

  configureStack(data: ISimpleAppStack) {
    this.controller = configureController(data);
    return this;
  }
}
