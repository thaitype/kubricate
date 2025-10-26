import { defineConfig } from 'kubricate';

import { secretRegistry } from './src/setup-secrets';
import simpleAppStack from './src/stacks';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  secret: {
    secretSpec: secretRegistry,
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
