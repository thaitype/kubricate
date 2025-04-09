import { defineConfig } from 'kubricate';
import simpleAppStack from './src/stack-config';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
  secrets: {
    kubernetes: {
      merge: {
        providerLevel: 'warn',
        managerLevel: 'warn',
        stackLevel: 'warn',
        workspaceLevel: 'warn',
      }
    }
  }
});
