import { NamespaceStack } from '@kubricate/stacks';
import { defineConfig } from 'kubricate';

const namespace = new NamespaceStack().from({ name: 'my-namespace' });

export default defineConfig({
  stacks: {
    namespace,
  },
  generate: {
    outputMode: 'stack',
  },
  metadata: {
    // Disable DateTime & Version injection for snapshot testing
    injectManagedAt: false,
    injectVersion: false,
  }
});
