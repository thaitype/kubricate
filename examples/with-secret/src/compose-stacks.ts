import { NamespaceStack } from '@kubricate/stacks';

import { secretManager } from './setup-secrets';
import { config } from './shared-config';
import { AppStack } from './stacks/AppStack';
import { CronJobStack } from './stacks/CronJobStack';

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
    c.secrets('my_app_key').forName('ENV_APP_KEY').inject();
    c.secrets('my_app_key_2').forName('ENV_APP_KEY_2').inject();
    c.secrets('DOCKER_SECRET').inject();
  })
  .override({
    service: {
      spec: {
        type: 'LoadBalancer',
      },
    },
  });

const cronJob = CronJobStack.from({
  name: 'my-cron-job',
}).useSecrets(secretManager, c => {
  c.secrets('my_app_key')
    .forName('ENV_APP_KEY')
    .inject('env', {
      targetPath: 'spec.jobTemplate.spec.template.spec.containers[0].env',
    })
    .intoResource('cronJob');
});

export default { namespace, myApp, cronJob };
