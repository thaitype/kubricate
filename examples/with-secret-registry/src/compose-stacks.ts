import { NamespaceStack } from '@kubricate/stacks';
import { AppStack } from './stacks/AppStack';
import { config } from './shared-config';
import { secretRegistry } from './setup-secret';

const namespace = new NamespaceStack().from({
  name: config.namespace,
});

const frontend = AppStack
  .from({
    namespace: config.namespace,
    imageName: 'nginx',
    name: 'my-frontend',
  })
  .useSecrets(secretRegistry.get('frontend'), c => {
    c.secrets('frontend_app_key').forName('ENV_APP_KEY').inject();
  })
  .override({
    service: {
      spec: {
        type: 'LoadBalancer',
      },
    },
  });

const backend = AppStack
  .from({
    namespace: config.namespace,
    imageName: 'nginx',
    name: 'my-backend',
  })
  .useSecrets(secretRegistry.get('backend'), c => {
    c.secrets('backend_app_key').forName('ENV_APP_KEY_2').inject();
  })

export default { namespace, frontend, backend };
