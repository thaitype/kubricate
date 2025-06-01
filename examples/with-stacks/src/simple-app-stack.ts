import { Stack } from 'kubricate';

import { namespaceTemplate, simpleAppTemplate } from '@kubricate/stacks';

const namespace = Stack.fromTemplate(namespaceTemplate, {
  name: 'my-namespace',
});

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  imageName: 'nginx',
  name: 'my-app',
}).override({
  service: {
    apiVersion: 'v1',
    kind: 'Service',
    spec: {
      type: 'LoadBalancer',
    },
  },
});

export default { namespace, myApp };
