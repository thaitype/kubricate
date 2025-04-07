import { NamespaceStack } from '@kubricate/stacks';
import { AppStack } from './stacks/AppStack';
import { config, secretManager } from './config';

const namespace = new NamespaceStack().from({
  name: config.namespace,
});

const myApp = new AppStack()
  .from({
    namespace: config.namespace,
    imageName: 'nginx',
    name: 'my-app',
  })
  .useSecrets(secretManager, c => {
    c.secrets('my_app_key').forName('ENV_APP_KEY').inject({ kind: 'env', containerIndex: 0 });
    c.secrets('DOCKER_SECRET').inject({ kind: 'imagePullSecret' })
  })
  .override({
    service: {
      spec: {
        type: 'LoadBalancer',
      },
    },
  });

export default { namespace, myApp };
