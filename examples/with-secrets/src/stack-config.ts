import { NamespaceStack } from '@kubricate/stacks';
import { AppStack } from './stacks/AppStack';
import { config, secretManager } from './config';

const namespace = new NamespaceStack().from({
  name: config.namespace,
});

const myApp = new AppStack()
  // Use secrets before the from method
  .useSecrets(secretManager, injector => {
    injector.secrets('my_app_key').inject({ kind: 'env', containerIndex: 0 }).intoResource('deployment');
  })
  // .useSecrets(secretManager, {
  //   injectes: [
  //     {
  //       resourceId: 'deployment',
  //       path: 'spec.template.spec.containers[0].env',
  //     },
  //   ],
  //   env: [
  //     {
  //       name: 'MY_ENV',
  //       value: 'my-value',
  //     },
  //     {
  //       name: 'my_app_key',
  //       secretRef: 'my_app_key',
  //     },
  //   ],
  // })
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
