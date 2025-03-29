import { NamespaceStack } from '@kubricate/stacks';
import { AppStack } from './stacks/AppStack';
import { config, secretManager } from './config';

const namespace = new NamespaceStack().configureStack({
  name: config.namespace,
});

const myApp = new AppStack(secretManager)
  .configureStack({
    namespace: config.namespace,
    imageName: 'nginx',
    name: 'my-app',
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
  .overrideStack({
    service: {
      spec: {
        type: 'LoadBalancer',
      },
    },
  });

export default { namespace, myApp };
