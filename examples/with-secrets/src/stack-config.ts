import { NamespaceStack } from '@kubricate/stacks';
import { AppStack } from './stacks/AppStack';
import { config } from './config';

const namespace = new NamespaceStack().configureStack({
  name: config.namespace,
});

const myApp = new AppStack()
  .configureStack({
    namespace: config.namespace,
    imageName: 'nginx',
    name: 'my-app',
  })
  .overrideStack({
    service: {
      spec: {
        type: 'LoadBalancer',
      },
    },
  });

export default { namespace, myApp };
