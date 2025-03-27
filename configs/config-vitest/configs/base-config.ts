import { defineConfig } from 'vitest/config';
import path from 'node:path';

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
