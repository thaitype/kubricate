import { NamespaceStack } from '@kubricate/stacks';
import { AppStack } from './stacks/AppStack';

const namespace = new NamespaceStack().configureStack({
  name: 'my-namespace',
});

const myApp = new AppStack()
  .configureStack({
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
