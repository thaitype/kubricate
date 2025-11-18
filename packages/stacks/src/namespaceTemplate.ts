import { Namespace } from 'kubernetes-models/v1';

import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

import { metadata } from './metadata.gen.js';

export interface INamespaceStack {
  name: string;
}

export const namespaceTemplate = defineStackTemplate({
  name: '@kubricate/stacks/namespace',
  metadata: {
    version: metadata.version,
    author: 'Kubricate Team',
    repository: 'https://github.com/thaitype/kubricate',
  },
  build(data: INamespaceStack) {
    return {
      namespace: kubeModel(Namespace, {
        metadata: {
          name: data.name,
        },
      }),
    };
  },
});
