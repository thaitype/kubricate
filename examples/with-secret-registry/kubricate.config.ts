import { defineConfig } from 'kubricate';
import simpleAppStack from './src/config';
import { secretRegistry } from './src/secret';

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
        // intraStack: 'error',
      }
    }
  }
});
