import { NamespaceStack } from '@kubricate/stacks';
import { AppStack } from './stacks/AppStack';
import { config, secretManager } from './config';

const namespace = new NamespaceStack().from({
  name: config.namespace,
});

const myApp = new AppStack()
  .from({
    namespace: config.namespace,
    imageName: 'nginx',
    name: 'my-app',
  })
  .useSecrets(secretManager, {
    env: [
      {
        name: 'MY_ENV',
        value: 'my-value',
      },
      {
        name: 'my_app_key',
        secretRef: 'my_app_key',
      },
    ],
  })
  .override({
    service: {
      spec: {
        type: 'LoadBalancer',
      },
    },
  });

export default { namespace, myApp };
