import path from 'node:path';

import { defineConfig } from 'vitest/config';

export const baseConfig = defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'istanbul',
      reporter: [
        [
          'json',
          {
            file: `../coverage.json`,
          },
        ],
      ],
      enabled: true,
    },
  },
});
