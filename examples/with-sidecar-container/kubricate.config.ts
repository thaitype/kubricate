import { defineConfig } from 'kubricate';

import { multiContainerApp } from './src/stacks';
import { secretManager } from './src/setup-secrets';

export default defineConfig({
  stacks: {
    multiContainerApp
  },
  secret: {
    secretSpec: secretManager,
  }
});
