import { createSimpleAppStack } from '../SimpleAppStack.js';

export default createSimpleAppStack({
  imageName: 'nginx',
})
  .overrideStack({
    service: {
      spec: {
        type: 'LoadBalancer',
      },
    },
  })
  .build();
