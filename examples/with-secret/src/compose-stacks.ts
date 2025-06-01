import { Stack } from 'kubricate';

import { namespaceTemplate, simpleAppTemplate } from '@kubricate/stacks';

import { secretManager } from './setup-secrets';
import { config } from './shared-config';
import { cronJobTemplate } from './stacks/CronJobStack';

const namespace = Stack.fromTemplate(namespaceTemplate, {
  name: config.namespace,
});

const myApp = Stack.fromTemplate(simpleAppTemplate, {
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
      apiVersion: 'v1',
      kind: 'Service',
      spec: {
        type: 'LoadBalancer',
      },
    },
  });

const cronJob = Stack.fromTemplate(cronJobTemplate, {
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
