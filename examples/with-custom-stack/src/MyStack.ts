import { createStack, ResourceComposer } from 'kubricate';
import { Namespace } from 'kubernetes-models/v1';

interface MyInput {
  name: string;
}

const MyStack = createStack('MyStack', (data: MyInput) => {
  return new ResourceComposer().addClass({
    id: 'namespace',
    type: Namespace,
    config: {
      metadata: { name: data.name },
    },
  });
});

export const frontend = MyStack.from({
  name: 'frontend-namespace',
});

export const backend = MyStack.from({
  name: 'backend-namespace',
});
