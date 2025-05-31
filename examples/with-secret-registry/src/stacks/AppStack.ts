import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Service } from 'kubernetes-models/v1/Service';
import { ResourceComposer, createStack } from 'kubricate';

export interface IAppStack {
  namespace: string;
  name: string;
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
}

export const AppStack = createStack('AppStack', (data: IAppStack) => {
  const port = data.port || 80;
  const replicas = data.replicas || 1;
  const imageRegistry = data.imageRegistry || '';

  const metadata = {
    name: data.name,
    namespace: data.namespace,
  };
  const labels = { app: data.name };

  return new ResourceComposer()
    .addClass({
      id: 'deployment',
      type: Deployment,
      config: {
        metadata: metadata,
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
                  // This will automatically inject the secret into the container
                  // env: []
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
});
