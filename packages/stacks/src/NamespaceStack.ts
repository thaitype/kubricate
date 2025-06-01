import { Namespace } from 'kubernetes-models/v1';
import { ResourceComposer, BaseStack } from 'kubricate';

interface INamespaceStack {
  name: string;
}

function configureComposer(data: INamespaceStack) {
  return new ResourceComposer().addClass({
    id: 'namespace',
    type: Namespace,
    config: {
      metadata: {
        name: data.name,
      },
    },
  });
}

/**
 * @deprecated Use `namespaceStackTemplate` instead.
 */
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
