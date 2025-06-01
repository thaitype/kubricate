import { configClass, defineStackTemplate } from '@kubricate/core';
import { Namespace } from 'kubernetes-models/v1';
import { createStack, defineConfig, initStack, ResourceComposer } from 'kubricate';

interface MyInput {
  name: string;
}

const namespaceStackTemplate = defineStackTemplate('MyStackNew', (data: MyInput) => {
  return {
    namespace: configClass(Namespace, {
      metadata: { name: data.name },
    }),
  }
});

const myStackNew = initStack(namespaceStackTemplate, {
  name: 'MyStackNew',
});

defineConfig({
  stacks: {
    MyStackNew: myStackNew,
  }
})

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
