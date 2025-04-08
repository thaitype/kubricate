import { defineConfig } from 'kubricate';
import { backend, frontend } from './src/MyStack';

export default defineConfig({
  stacks: {
    frontend,
    backend
  },
});
