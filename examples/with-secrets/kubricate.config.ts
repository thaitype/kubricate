import { defineConfig } from 'kubricate';
import simpleAppStack from './src/stack-config';
import { secretManager } from './src/config';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  secrets: {
    manager: secretManager,
    merge: {
      // Default merge strategies
      
      // intraProvider: 'autoMerge',
      // crossProvider: 'error',
      // intraStack: 'error',
      // crossStack: 'error',
    }
  }
});
