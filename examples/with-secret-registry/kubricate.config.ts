import { defineConfig } from 'kubricate';
import simpleAppStack from './src/compose-stacks';
import { secretRegistry } from './src/setup-secret';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  secrets: {
    registry: secretRegistry,
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
