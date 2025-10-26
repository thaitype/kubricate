import { defineConfig } from 'kubricate';

import { secretManager } from './src/setup-secrets';
import simpleAppStack from './src/stacks';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  generate: {
    outputMode: 'resource',
  },
  secret: {
    secretSpec: secretManager,
    conflict: {
      strategies: {
        // Default conflict handling strategies
        // intraProvider: 'error',
        // crossProvider: 'error',
        // crossManager: 'error',
      },
    },
  },
});
