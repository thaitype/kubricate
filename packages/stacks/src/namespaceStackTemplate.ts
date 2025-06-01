import { Namespace } from 'kubernetes-models/v1';

import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

export interface INamespaceStack {
  name: string;
}

export const namespaceStackTemplate = defineStackTemplate('NamespaceStack', (data: INamespaceStack) => {
  return {
    namespace: kubeModel(Namespace, {
      metadata: {
        name: data.name,
      },
    }),
  };
});
