import { createStack, ManifestComposer } from '@kubricate/core';
import { Namespace } from 'kubernetes-models/v1';

interface MyInput {
  name: string;
}

const MyStack = createStack('MyStack', (data: MyInput) => {
  // Dosomething for your data, e.g. Validate the input data
  return new ManifestComposer().addClass({
    id: 'namespace',
    type: Namespace,
    config: {
      metadata: { name: data.name },
    },
  });
});

export const myStack = MyStack.from({
  name: 'my-namespace',
});
