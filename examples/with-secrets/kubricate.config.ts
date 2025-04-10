import { defineConfig } from 'kubricate';
import simpleAppStack from './src/stack-config';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  secrets: {
    merge: {
      intraProvider: 'autoMerge',
      crossProvider: 'error',
      intraStack: 'error',
      crossStack: 'error',
    }
  }
});
