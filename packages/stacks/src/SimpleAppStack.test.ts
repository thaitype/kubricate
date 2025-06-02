import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Service } from 'kubernetes-models/v1/Service';
import { describe, expect, it } from 'vitest';

import { SimpleAppStack } from './SimpleAppStack.js'; // adjust the import path

describe('SimpleAppStack', () => {
  it('should generate Deployment and Service with defaults', () => {
    const stack = new SimpleAppStack();

    stack.from({
      name: 'my-app',
      imageName: 'my-app',
    });

    const resources = Object.values(stack.build());

    // Should return 2 resources: Deployment + Service
    expect(resources).toHaveLength(2);

    const deployment = resources.find(r => r instanceof Deployment) as Deployment;
    const service = resources.find(r => r instanceof Service) as Service;

    expect(deployment).toBeInstanceOf(Deployment);
    expect(service).toBeInstanceOf(Service);

    // Check deployment metadata and spec
    expect(deployment.metadata?.name).toBe('my-app');
    expect(deployment.spec?.replicas).toBe(1);
    expect(deployment.spec?.template.spec?.containers[0].image).toBe('my-app');
    expect(deployment.spec?.template.spec?.containers[0].ports![0].containerPort).toBe(80);

    // Check service metadata and spec
    expect(service.metadata?.name).toBe('my-app');
    expect(service.spec?.ports?.[0].port).toBe(80);
    expect(service.spec?.selector).toEqual({ app: 'my-app' });
  });

  it('should override defaults if values provided', () => {
    const stack = new SimpleAppStack();

    stack.from({
      name: 'my-app',
      imageName: 'custom-image',
      imageRegistry: 'docker.io',
      port: 3000,
      replicas: 5,
    });

    const [deployment, service] = Object.values(stack.build());

    expect((deployment as Deployment).spec?.replicas).toBe(5);
    expect((deployment as Deployment).spec?.template.spec?.containers[0].image).toBe('docker.io/custom-image');
    expect((deployment as Deployment).spec?.template.spec?.containers[0].ports![0].containerPort).toBe(3000);
    expect((service as Service).spec?.ports?.[0].port).toBe(3000);
  });
});
