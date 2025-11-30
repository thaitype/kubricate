import { defineConfig } from 'kubricate';

import { metadata, sharedStacks } from '../../shared-configs';

export default defineConfig({
  stacks: {
    namespace: sharedStacks.namespace,
    frontend: sharedStacks.frontend,
  },
  generate: {
    outputMode: 'resource',
  },
  metadata,
});
