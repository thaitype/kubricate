import { Deployment } from 'kubernetes-models/apps/v1';

import { kubeModel } from '@kubricate/kubernetes-models';
import { Stack } from 'kubricate';

import { secretManager } from './setup-secrets';

export const multiContainerApp = Stack.fromStatic('ContainerWithSidecar', {
  deployment: kubeModel(Deployment, {
    metadata: {
      name: 'multi-container-app',
      namespace: 'default',
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: 'multi-container-app',
        },
      },
      template: {
        metadata: {
          labels: {
            app: 'multi-container-app',
          },
        },
        spec: {
          containers: [
            {
              name: 'main-app',
              image: 'nginx',
            },
            {
              name: 'my-sidecar',
              image: 'my-sidecar-image',
            },
          ],
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any,
  // Fix type later on https://github.com/thaitype/kubricate/issues/138
}).useSecrets(secretManager, c => {
  // Inject into first container (index 0) - default behavior
  c.secrets('DATABASE_URL').inject();

  // Inject into second container (index 1) or Sidecar Container
  c.secrets('MONITORING_TOKEN').inject('env', { containerIndex: 1 });
});
