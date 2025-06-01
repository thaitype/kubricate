import { Namespace } from 'kubernetes-models/v1';
import { Stack } from 'kubricate';

import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

interface MyInput {
  name: string;
}

const namespaceTemplate = defineStackTemplate('Namespace', (data: MyInput) => {
  return {
    namespace: kubeModel(Namespace, {
      metadata: { name: data.name },
    }),
  };
});

export const frontend = Stack.fromTemplate(namespaceTemplate, {
  name: 'frontend-namespace',
});

export const backend = Stack.fromTemplate(namespaceTemplate, {
  name: 'backend-namespace',
});
