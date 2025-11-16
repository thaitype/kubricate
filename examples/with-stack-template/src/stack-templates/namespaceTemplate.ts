import { Namespace } from 'kubernetes-models/v1';

import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

interface MyInput {
  name: string;
}

/**
 * Namespace Stack Template
 *
 * This example demonstrates the new metadata API for stack templates.
 * You can provide rich metadata including version, author, homepage, repository, and description.
 * This metadata will be injected into the generated Kubernetes manifests as annotations.
 */
export const namespaceTemplate = defineStackTemplate(
  {
    name: 'namespace-template',
    metadata: {
      version: '1.0.0',
      author: 'Kubricate Team',
      description: 'A simple namespace template for Kubernetes',
      homepage: 'https://github.com/thaitype/kubricate',
      repository: 'https://github.com/thaitype/kubricate',
    },
  },
  (data: MyInput) => {
    return {
      namespace: kubeModel(Namespace, {
        metadata: { name: data.name },
      }),
    };
  }
);
