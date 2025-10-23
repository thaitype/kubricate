import { defineConfig } from 'kubricate';

import { secretManager } from './src/setup-secrets';
import stacks from './src/stacks';

export default defineConfig({
  stacks: {
    ...stacks,
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
