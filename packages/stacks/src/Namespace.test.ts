import { describe, it, expect } from 'vitest';
import { NamespaceStack } from './NamespaceStack.js'; // path to your implementation
import { Namespace } from 'kubernetes-models/v1';

describe('NamespaceStack', () => {
  it('should compose and build a Kubernetes Namespace resource', () => {
    const stack = new NamespaceStack();
    const input = { name: 'my-namespace' };

    // Call .from() with input
    stack.from(input);

    // Build the stack and get the result
    const resources = stack.build();

    expect(resources).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ns = resources[0] as any;

    // Check it’s a Namespace instance
    expect(ns).toBeInstanceOf(Namespace);

    // Check metadata
    expect(ns.metadata?.name).toBe('my-namespace');
    expect(ns.metadata?.labels?.['thaitype.dev/kubricate']).toBe('true');
  });
});
