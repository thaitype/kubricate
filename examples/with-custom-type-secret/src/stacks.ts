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
 * Application Stack with CustomTypeSecretProvider
 *
 * This example demonstrates using CustomTypeSecretProvider to inject
 * secrets with a custom Kubernetes Secret type (vendor.com/api-credentials).
 *
 * Features demonstrated:
 * 1. Individual key injection using 'env' strategy with custom secret type
 * 2. Injecting multiple keys from the same custom-type secret
 * 3. Using allowedKeys validation for type safety
 */
const vendorIntegrationApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: config.namespace,
  imageName: 'vendor-integration-app',
  name: 'vendor-integration',
})
  .useSecrets(secretManager, c => {
    // Inject API key from VENDOR_API_CONFIG
    c.secrets('VENDOR_API_CONFIG').forName('VENDOR_API_KEY').inject('env', { key: 'api_key' });

    // Inject API endpoint from VENDOR_API_CONFIG
    c.secrets('VENDOR_API_CONFIG').forName('VENDOR_API_ENDPOINT').inject('env', { key: 'api_endpoint' });

    // Inject API timeout from VENDOR_API_CONFIG
    c.secrets('VENDOR_API_CONFIG').forName('VENDOR_API_TIMEOUT').inject('env', { key: 'api_timeout' });
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

export default {
  namespace,
  vendorIntegrationApp,
};
