import { namespaceTemplate, simpleAppTemplate } from '@kubricate/stacks';
import { Stack } from 'kubricate';

import { secretManager } from './setup-secrets';
import { config } from './shared-config';

/**
 * Namespace stack
 */
const namespace = Stack.fromTemplate(namespaceTemplate, {
  name: config.namespace,
});

/**
 * Example 1: Using env injection with individual keys
 *
 * This demonstrates injecting username and password as separate
 * environment variables using the 'key' parameter.
 */
const apiServiceApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'nginx',
  name: 'api-service',
})
  .useSecrets(secretManager, c => {
    // Inject username from API_CREDENTIALS
    c.secrets('API_CREDENTIALS').forName('API_USERNAME').inject('env', { key: 'username' });

    // Inject password from API_CREDENTIALS
    c.secrets('API_CREDENTIALS').forName('API_PASSWORD').inject('env', { key: 'password' });
  })
  .override({
    service: {
      apiVersion: 'v1',
      kind: 'Service',
      spec: {
        type: 'ClusterIP',
        ports: [
          {
            port: 80,
            targetPort: 80,
            protocol: 'TCP',
            name: 'http',
          },
        ],
      },
    },
  });

/**
 * Example 2: Using envFrom injection with prefix
 *
 * This demonstrates bulk injection of all credentials using envFrom.
 * The prefix ensures no naming conflicts with other environment variables.
 */
const dbClientApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'mysql-client',
  name: 'db-client',
})
  .useSecrets(secretManager, c => {
    // Inject all credentials with DB_ prefix
    // Results in: DB_username and DB_password
    c.secrets('DB_CREDENTIALS').inject('envFrom', { prefix: 'DB_' });
  })
  .override({
    service: {
      apiVersion: 'v1',
      kind: 'Service',
      spec: {
        type: 'ClusterIP',
        ports: [
          {
            port: 3306,
            targetPort: 3306,
            protocol: 'TCP',
            name: 'mysql',
          },
        ],
      },
    },
  });

/**
 * Example 3: Using envFrom without prefix
 *
 * Demonstrates bulk injection without prefix.
 * Results in environment variables: username and password
 */
const workerApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'worker',
  name: 'background-worker',
})
  .useSecrets(secretManager, c => {
    // Inject all credentials without prefix
    c.secrets('API_CREDENTIALS').inject('envFrom');
  })
  .override({
    // Remove service from worker (not needed)
    service: undefined,
  });

export default {
  namespace,
  apiServiceApp,
  dbClientApp,
  workerApp,
};
