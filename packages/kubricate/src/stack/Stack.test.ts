/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

import { defineStackTemplate } from '@kubricate/core';

import type { ResourceComposer } from './ResourceComposer.js';
import { createStack, Stack } from './Stack.js';

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

  it('should build from a StackTemplate using fromTemplate()', () => {
    const template = defineStackTemplate('hello', (input: { name: string }) => ({
      ns: {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: input.name },
      },
    }));

    const stack = Stack.fromTemplate(template, { name: 'my-ns' });
    const built = stack.build();

    expect(stack._name).toBe('hello');
    expect((built.ns as any).metadata?.name).toBe('my-ns');
  });

  it('should build from static resource using fromStatic()', () => {
    const stack = Stack.fromStatic('static-stack', {
      configMap: {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: 'my-config' },
      },
    });

    const built = stack.build();

    expect(stack._name).toBe('static-stack');
    expect((built.configMap as any).metadata?.name).toBe('my-config');
  });
});
