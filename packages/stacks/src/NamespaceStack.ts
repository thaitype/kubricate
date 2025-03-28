import { Namespace } from 'kubernetes-models/v1';
import { KubricateController, KubricateStack  } from '@kubricate/core';

export interface INamespaceStack  {
  name: string;
}

export class NamespaceStack extends KubricateStack {
  constructor() {
    super();
  }

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
