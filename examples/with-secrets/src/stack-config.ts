import { NamespaceStack } from '@kubricate/stacks';
import { AppStack } from './stacks/AppStack';
import { config, secretManager } from './config';

const namespace = new NamespaceStack().from({
  name: config.namespace,
});

const myApp = new AppStack()
  // Use secrets before the from method
  .useSecrets(secretManager, injector => {
    injector.setDefaultResourceId('deployment');
    injector.secrets('my_app_key').inject({ kind: 'env', containerIndex: 0 });
    injector.secrets('DOCKER_SECRET').inject({ kind: 'imagePull'})
  })
  .from({
    namespace: config.namespace,
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
