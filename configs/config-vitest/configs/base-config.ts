import path from 'node:path';

import { defineConfig } from 'vitest/config';

export const baseConfig = defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'istanbul',
      exclude: ['**/tests/**', '**/configs/**', '**/tools/**'],
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
