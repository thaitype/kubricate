import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Service } from 'kubernetes-models/v1/Service';
import { KubricateController } from 'kubricate';

export interface ISimpleAppStack {
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
}

export const createSimpleAppStack = (data: ISimpleAppStack) => {
  const port = data.port || 80;
  const replicas = data.replicas || 1;
  const imageRegistry = data.imageRegistry || '';

  const metadata = { name: 'nginx' };
  const labels = { app: 'nginx' };

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
};
