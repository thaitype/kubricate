import { namespaceTemplate, simpleAppTemplate } from '@kubricate/stacks';
import { defineConfig, Stack } from 'kubricate';

export default defineConfig({
  stacks: {
    namespace: Stack.fromTemplate(namespaceTemplate, { name: 'test-namespace' }),
    app: Stack.fromTemplate(simpleAppTemplate, {
      name: 'test-app',
      namespace: 'test-namespace',
      imageName: 'nginx',
    }),
  },
  generate: {
    outputMode: 'flat',
  },
  metadata: {
    // Disable dynamic fields for consistent testing
    injectManagedAt: false,
    injectVersion: false,
  },
});
