import { defineConfig } from 'kubricate';
import simpleAppStack from './src/compose-stacks';
import { secretManager } from './src/setup-secrets';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  generate: {
    outputMode: 'resource',
  },
  secret: {
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
