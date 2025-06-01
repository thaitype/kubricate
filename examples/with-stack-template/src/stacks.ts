import { Stack } from 'kubricate';

import { namespaceTemplate } from './stack-templates/namespaceTemplate';

export const frontend = Stack.fromTemplate(namespaceTemplate, {
  name: 'frontend-namespace',
});

export const backend = Stack.fromTemplate(namespaceTemplate, {
  name: 'backend-namespace',
});
