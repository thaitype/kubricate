import { defineConfig } from 'kubricate';

import { backend, frontend } from './src/stacks';

export default defineConfig({
  stacks: {
    frontend,
    backend,
  },
});
