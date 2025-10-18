import { defineConfig } from 'kubricate';

import { secretManager } from './src/setup-secrets';
import { multiContainerApp } from './src/stacks';

export default defineConfig({
  stacks: {
    multiContainerApp,
  },
  secret: {
    secretSpec: secretManager,
  },
});
