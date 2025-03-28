import { Namespace } from 'kubernetes-models/v1';
import { KubricateController } from '@kubricate/core';

export interface INamespaceStack {
  name: string;
}

export class NamespaceStack {
  constructor() {}

  configureStack(data: INamespaceStack) {
    return new KubricateController().add({
      id: 'namespace',
      type: Namespace,
      config: {
        metadata: {
          name: data.name,
        },
      },
    });
  }
}
