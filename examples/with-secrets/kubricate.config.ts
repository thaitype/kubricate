import { defineConfig } from 'kubricate';
import simpleAppStack from './src/stack-config';
import { secretManager } from './src/config';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  secrets: {
    manager: secretManager,
    handleSecretConflict: {
      // Default merge strategies
      
      // intraProvider: 'error',
      // crossProvider: 'error',
      // intraStack: 'error',
    }
  }
});
