import { Namespace } from 'kubernetes-models/v1';

import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

export interface INamespaceStack {
  name: string;
}

export const namespaceTemplate = defineStackTemplate(
  {
    name: '@kubricate/stacks/namespace',
    metadata: {
      version: '0.22.0',
      author: 'Kubricate Team',
      repository: 'https://github.com/thaitype/kubricate',
    },
  },
  (data: INamespaceStack) => {
    return {
      namespace: kubeModel(Namespace, {
        metadata: {
          name: data.name,
        },
      }),
    };
  }
);
