import { SimpleAppStack, NamespaceStack } from '@kubricate/stacks';

const namespace = new NamespaceStack()
  .configureStack({
    name: 'my-namespace',
  })
  .build();

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
  .build();

export default [namespace, myApp];
