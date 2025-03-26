import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Service } from 'kubernetes-models/v1/Service';
import { KubricateController } from 'kubricate';

export interface ISimpleAppStack {
  name: string;
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
}

export class SimpleAppStack {
  constructor(private data: ISimpleAppStack) {}

  configureStack() {
    const port = this.data.port || 80;
    const replicas = this.data.replicas || 1;
    const imageRegistry = this.data.imageRegistry || '';

    const metadata = { name: this.data.name };
    const labels = { app: this.data.name };

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
                    image: imageRegistry + 'nginx',
                    name: 'nginx',
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
}
