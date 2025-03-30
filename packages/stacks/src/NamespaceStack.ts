import { Namespace } from 'kubernetes-models/v1';
import { ManifestComposer, BaseStack } from '@kubricate/core';

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

export class NamespaceStack extends BaseStack<typeof configureComposer> {
  constructor() {
    super();
  }

  from(data: INamespaceStack) {
    const composer = configureComposer(data);
    this.setComposer(composer);
    return this;
  }
}
