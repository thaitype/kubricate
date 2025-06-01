import { Stack } from 'kubricate';

import { namespaceTemplate, simpleAppTemplate } from '@kubricate/stacks';

import { secretRegistry } from './setup-secrets';
import { config } from './shared-config';

const namespace = Stack.fromTemplate(namespaceTemplate, {
  name: config.namespace,
});

const frontend = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'nginx',
  name: 'my-frontend',
})
  .useSecrets(secretRegistry.get('frontend'), c => {
    c.secrets('frontend_app_key').forName('ENV_APP_KEY').inject();
  })
  .override({
    service: {
      apiVersion: 'v1',
      kind: 'Service',
      spec: {
        type: 'LoadBalancer',
      },
    },
  });

const backend = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'nginx',
  name: 'my-backend',
}).useSecrets(secretRegistry.get('backend'), c => {
  c.secrets('backend_app_key').forName('ENV_APP_KEY_2').inject();
});

export default { namespace, frontend, backend };
