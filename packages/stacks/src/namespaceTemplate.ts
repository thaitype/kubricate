import { Namespace } from 'kubernetes-models/v1';

import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

export interface INamespaceStack {
  name: string;
}

export const namespaceTemplate = defineStackTemplate('Namespace', (data: INamespaceStack) => {
  return {
    namespace: kubeModel(Namespace, {
      metadata: {
        name: data.name,
      },
    }),
  };
});
