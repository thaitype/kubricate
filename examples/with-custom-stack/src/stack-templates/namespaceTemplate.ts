import { Namespace } from 'kubernetes-models/v1';

import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

interface MyInput {
  name: string;
}

export const namespaceTemplate = defineStackTemplate('Namespace', (data: MyInput) => {
  return {
    namespace: kubeModel(Namespace, {
      metadata: { name: data.name },
    }),
  };
});
