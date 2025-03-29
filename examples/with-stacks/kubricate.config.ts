import { defineConfig } from 'kubricate';
import simpleAppStack from './src/simple-app-stack';

export default defineConfig({
  stacks: {
    ...simpleAppStack,
  },
});
