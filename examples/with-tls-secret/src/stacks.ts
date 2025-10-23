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
 * This demonstrates injecting TLS certificate and key as separate
 * environment variables using the 'key' parameter.
 */
const ingressControllerApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'nginx',
  name: 'ingress-controller',
})
  .useSecrets(secretManager, c => {
    // Inject certificate from INGRESS_TLS
    c.secrets('INGRESS_TLS').forName('TLS_CERT').inject('env', { key: 'tls.crt' });

    // Inject private key from INGRESS_TLS
    c.secrets('INGRESS_TLS').forName('TLS_KEY').inject('env', { key: 'tls.key' });
  })
  .override({
    service: {
      apiVersion: 'v1',
      kind: 'Service',
      spec: {
        type: 'LoadBalancer',
        ports: [
          {
            port: 443,
            targetPort: 443,
            protocol: 'TCP',
            name: 'https',
          },
        ],
      },
    },
  });

/**
 * Example 2: Using envFrom injection with prefix
 *
 * This demonstrates bulk injection of TLS material using envFrom.
 * The prefix ensures no naming conflicts with other environment variables.
 */
const apiGatewayApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'api-gateway',
  name: 'api-gateway',
})
  .useSecrets(secretManager, c => {
    // Inject all TLS material with TLS_ prefix
    // Results in: TLS_tls.crt and TLS_tls.key
    c.secrets('API_TLS').inject('envFrom', { prefix: 'TLS_' });
  })
  .override({
    service: {
      apiVersion: 'v1',
      kind: 'Service',
      spec: {
        type: 'ClusterIP',
        ports: [
          {
            port: 8443,
            targetPort: 8443,
            protocol: 'TCP',
            name: 'https',
          },
        ],
      },
    },
  });

/**
 * Example 3: Using envFrom without prefix
 *
 * Demonstrates bulk injection without prefix.
 * Results in environment variables: tls.crt and tls.key
 */
const sidecarProxyApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'envoy-proxy',
  name: 'sidecar-proxy',
})
  .useSecrets(secretManager, c => {
    // Inject all TLS material without prefix
    c.secrets('INGRESS_TLS').inject('envFrom');
  })
  .override({
    // Remove service from sidecar proxy (not needed)
    service: undefined,
  });

export default {
  namespace,
  ingressControllerApp,
  apiGatewayApp,
  sidecarProxyApp,
};
