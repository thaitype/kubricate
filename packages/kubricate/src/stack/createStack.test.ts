/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';

import type { ResourceComposer } from './ResourceComposer.js';

import { Stack, createStack } from './createStack.js';

describe('Stack', () => {
  it('should call builder and set composer on .from()', () => {
    const mockComposer = {} as ResourceComposer<any>;
    const builder = vi.fn().mockReturnValue(mockComposer);

    const stack = new Stack(builder);
    const result = stack.from({ project: 'example' });

    expect(builder).toHaveBeenCalledWith({ project: 'example' });
    expect(stack._composer).toBe(mockComposer);
    expect(result).toBe(stack);
  });

  it('should set stack name when used with createStack()', () => {
    const mockComposer = {} as ResourceComposer<any>;
    const builder = vi.fn().mockReturnValue(mockComposer);

    const stack = createStack('my-stack', builder).from({ foo: 'bar' });

    expect(stack._name).toBe('my-stack');
    expect(stack._composer).toBe(mockComposer);
    expect(builder).toHaveBeenCalledWith({ foo: 'bar' });
  });
});
