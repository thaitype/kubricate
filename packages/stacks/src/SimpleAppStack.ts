import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Service } from 'kubernetes-models/v1/Service';
import { ResourceComposer, BaseStack } from 'kubricate';
import { joinPath } from '@kubricate/toolkit';

export interface ISimpleAppStack {
  name: string;
  namespace?: string;
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
}

function configureComposer(data: ISimpleAppStack) {
  const port = data.port || 80;
  const replicas = data.replicas || 1;
  const imageRegistry = data.imageRegistry || '';

  const metadata = { name: data.name, namespace: data.namespace };
  const labels = { app: data.name };

  return new ResourceComposer()
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
                  image: joinPath(imageRegistry, data.imageName),
                  name: data.name,
                  ports: [{ containerPort: port }],
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

export class SimpleAppStack extends BaseStack<typeof configureComposer> {
  constructor() {
    super();
  }

  override from(data: ISimpleAppStack) {
    const composer = configureComposer(data);
    this.setComposer(composer);
    return this;
  }
}
