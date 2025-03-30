import { Namespace } from 'kubernetes-models/v1';
import { ManifestComposer, KubricateStack } from '@kubricate/core';

export interface INamespaceStack {
  name: string;
}

function configureComposer(data: INamespaceStack) {
  return new ManifestComposer().addClass({
    id: 'namespace',
    type: Namespace,
    config: {
      metadata: {
        name: data.name,
      },
    },
  });
}

export class NamespaceStack extends KubricateStack<typeof configureComposer> {
  constructor() {
    super();
  }

  configureStack(data: INamespaceStack) {
    this.composer = configureComposer(data);
    return this;
  }
}
