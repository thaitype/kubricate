import { SimpleAppStack, NamespaceStack } from '@kubricate/stacks';

const namespace = new NamespaceStack()
  .configureStack({
    name: 'my-namespace',
  });

const myApp = new SimpleAppStack()
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
  })

export default { namespace, myApp };
