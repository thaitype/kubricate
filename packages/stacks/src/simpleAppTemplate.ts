import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import type { IContainer } from 'kubernetes-models/v1';
import { Service } from 'kubernetes-models/v1/Service';

import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';
import { joinPath } from '@kubricate/toolkit';

export interface ISimpleAppStack {
  name: string;
  namespace?: string;
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
  env?: IContainer['env'];
}

export const simpleAppTemplate = defineStackTemplate('SimpleApp', (data: ISimpleAppStack) => {
  const port = data.port ?? 80;
  const replicas = data.replicas ?? 1;
  const imageRegistry = data.imageRegistry ?? '';

  const metadata = { name: data.name, namespace: data.namespace };
  const labels = { app: data.name };

  return {
    deployment: kubeModel(Deployment, {
      metadata,
      spec: {
        replicas,
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
                env: data.env,
              },
            ],
          },
        },
      },
    }),
    service: kubeModel(Service, {
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
    }),
  };
});
