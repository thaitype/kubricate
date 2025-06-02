import { defineConfig } from 'kubricate';

import simpleAppStack from './src/stacks';
import { secretManager } from './src/setup-secrets';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
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
