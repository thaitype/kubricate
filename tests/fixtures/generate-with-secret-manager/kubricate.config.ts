import { defineConfig } from 'kubricate';
import { frontendSecretManager, metadata, sharedStacks } from '../shared-configs';

export default defineConfig({
  secret: {
    manager: frontendSecretManager,
  },
  stacks: {
    namespace: sharedStacks.namespace,
    frontend: sharedStacks.frontendWithSecretManager,
  },
  generate: {
    outputMode: 'flat',
  },
  metadata,
});
