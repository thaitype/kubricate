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
 * This demonstrates injecting ssh-privatekey and known_hosts as separate
 * environment variables using the 'key' parameter.
 */
const gitCloneApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'alpine/git',
  name: 'git-clone-service',
})
  .useSecrets(secretManager, c => {
    // Inject SSH private key from GIT_SSH_KEY
    c.secrets('GIT_SSH_KEY').forName('SSH_PRIVATE_KEY').inject('env', { key: 'ssh-privatekey' });

    // Inject known_hosts from GIT_SSH_KEY
    c.secrets('GIT_SSH_KEY').forName('SSH_KNOWN_HOSTS').inject('env', { key: 'known_hosts' });
  })
  .override({
    service: {
      apiVersion: 'v1',
      kind: 'Service',
      spec: {
        type: 'ClusterIP',
        ports: [
          {
            port: 22,
            targetPort: 22,
            protocol: 'TCP',
            name: 'ssh',
          },
        ],
      },
    },
  });

/**
 * Example 2: Using envFrom injection with prefix
 *
 * This demonstrates bulk injection of all SSH credentials using envFrom.
 * The prefix ensures no naming conflicts with other environment variables.
 */
const deploymentApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'deployment-runner',
  name: 'deployment-service',
})
  .useSecrets(secretManager, c => {
    // Inject all SSH credentials with DEPLOY_ prefix
    // Results in: DEPLOY_ssh-privatekey and DEPLOY_known_hosts
    c.secrets('DEPLOY_SSH_KEY').inject('envFrom', { prefix: 'DEPLOY_' });
  })
  .override({
    service: {
      apiVersion: 'v1',
      kind: 'Service',
      spec: {
        type: 'ClusterIP',
        ports: [
          {
            port: 8080,
            targetPort: 8080,
            protocol: 'TCP',
            name: 'http',
          },
        ],
      },
    },
  });

/**
 * Example 3: Using envFrom without prefix
 *
 * Demonstrates bulk injection without prefix.
 * Results in environment variables: ssh-privatekey and known_hosts
 */
const sshTunnelApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'ssh-tunnel',
  name: 'ssh-tunnel-worker',
})
  .useSecrets(secretManager, c => {
    // Inject all SSH credentials without prefix
    c.secrets('GIT_SSH_KEY').inject('envFrom');
  })
  .override({
    // Remove service from worker (not needed for background SSH tunnel)
    service: undefined,
  });

export default {
  namespace,
  gitCloneApp,
  deploymentApp,
  sshTunnelApp,
};
