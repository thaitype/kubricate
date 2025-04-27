import { defineConfig } from 'kubricate';
import { metadata, secretRegistry, sharedStacks } from '../shared-configs';

export default defineConfig({
  secret: {
    registry: secretRegistry
  },
  stacks: {
    namespace: sharedStacks.namespace,
    frontend: sharedStacks.frontendWithSecretRegistry,
  },
  generate: {
    outputMode: 'flat',
  },
  metadata,
});
