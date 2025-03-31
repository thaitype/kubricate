import { SimpleAppStack, NamespaceStack } from '@kubricate/stacks';

const namespace = new NamespaceStack().from({
  name: 'my-namespace',
});

const myApp = new SimpleAppStack()
  .from({
    imageName: 'nginx',
    name: 'my-app',
  })
  .override({
    service: {
      spec: {
        type: 'LoadBalancer',
      },
    },
  });

export default { namespace, myApp };
