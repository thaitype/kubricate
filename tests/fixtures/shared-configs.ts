import { NamespaceStack, SimpleAppStack } from "@kubricate/stacks";

export const sharedStacks = {
  namespace: new NamespaceStack().from({ name: 'my-namespace' }),
  frontend: new SimpleAppStack().from({
    name: 'my-namespace',
    imageName: 'nginx',
  })
}

export const metadata = {
  // Disable DateTime & Version injection for snapshot testing
  injectManagedAt: false,
  injectVersion: false,
}