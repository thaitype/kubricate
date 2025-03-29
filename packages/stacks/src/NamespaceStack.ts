import { Namespace } from 'kubernetes-models/v1';
import { KubricateComposer, KubricateStack } from '@kubricate/core';

export interface INamespaceStack {
  name: string;
}

function configureComposer(data: INamespaceStack) {
  return new KubricateComposer().add({
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
