import { Namespace } from 'kubernetes-models/v1';
import { describe, it, expect } from 'vitest';

import { namespaceTemplate } from './namespaceTemplate.js';

describe('namespaceStackTemplate', () => {
  it('should return a plain object representing a Kubernetes Namespace', () => {
    // Generate the resource using the stack template
    const resources = namespaceTemplate.create({ name: 'my-namespace' });

    // Ensure the returned object has a 'namespace' key
    expect(resources).toHaveProperty('namespace');

    const ns = resources.namespace;

    // Verify that the object is not an instance of the Namespace class
    expect(ns).not.toBeInstanceOf(Namespace);

    // Check the structure and values of the plain object
    expect(ns).toHaveProperty('apiVersion', 'v1');
    expect(ns).toHaveProperty('kind', 'Namespace');
    expect(ns).toHaveProperty('metadata.name', 'my-namespace');
  });
});
