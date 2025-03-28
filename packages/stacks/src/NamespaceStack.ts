import { Namespace } from 'kubernetes-models/v1';
import { KubricateController, KubricateStack } from '@kubricate/core';

export interface INamespaceStack {
  name: string;
}

function configureController(data: INamespaceStack) {
  return new KubricateController()
    .add({
      id: 'namespace',
      type: Namespace,
      config: {
        metadata: {
          name: data.name,
        },
      },
    });
}

export class NamespaceStack extends KubricateStack<typeof configureController> {

  constructor() {
    super();
  }

  configureStack(data: INamespaceStack) {
    this.controller = configureController(data);
    return this;
  }
}
