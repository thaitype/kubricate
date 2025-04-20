import { defineConfig } from 'kubricate';
import simpleAppStack from './src/stack-config';
import { secretManager } from './src/config';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  secrets: {
    manager: secretManager,
    conflict: {
      strategies: {
        // Default conflict handling strategies

        // intraProvider: 'error',
        // crossProvider: 'error',
        // crossManager: 'error',
      }
    }
  }
});
