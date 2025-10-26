import { defineConfig } from 'kubricate';

import simpleAppStack from './src/stacks';
import { secretRegistry } from './src/setup-secrets';

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
