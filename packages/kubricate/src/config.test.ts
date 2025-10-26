import { describe, expect, it } from 'vitest';

import { defineConfig } from './config.js';

describe('defineConfig', () => {
  it('should return the same config object passed to it', () => {
    const config = {
      stacks: {},
      secret: {
        secretSpec: undefined,
      },
    };

    const result = defineConfig(config);

    expect(result).toBe(config);
  });

  it('should work with empty config', () => {
    const config = {};
    const result = defineConfig(config);
    expect(result).toEqual({});
  });

  it('should preserve all config properties', () => {
    const config = {
      stacks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        myStack: {} as any,
      },
      secret: {
        secretSpec: {
          addSecret: () => {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      },
      generate: {
        outputDir: 'dist',
        outputMode: 'stack' as const,
      },
    };

    const result = defineConfig(config);

    expect(result).toBe(config);
    expect(result.stacks).toBe(config.stacks);
    expect(result.secret).toBe(config.secret);
    expect(result.generate).toBe(config.generate);
  });
});
