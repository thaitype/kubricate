import { defineConfig } from 'kubricate';
import simpleAppStack from './src/stack-config';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  secrets: {
    kubernetes: {
      merge: {
        managerLevel: 'autoMerge',
      }
    }
  }
});
