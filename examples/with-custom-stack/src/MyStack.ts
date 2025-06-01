import { Namespace } from 'kubernetes-models/v1';
import { Stack } from 'kubricate';

import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

interface MyInput {
  name: string;
}

const namespaceStackTemplate = defineStackTemplate('MyStack', (data: MyInput) => {
  return {
    namespace: kubeModel(Namespace, {
      metadata: { name: data.name },
    }),
  };
});

Stack.fromStatic('myNamespace', {
  namespace: {
    metadata: { name: 'default' },
  },
});

export const frontend = Stack.fromTemplate(namespaceStackTemplate, {
  name: 'frontend-namespace',
});

export const backend = Stack.fromTemplate(namespaceStackTemplate, {
  name: 'backend-namespace',
});
