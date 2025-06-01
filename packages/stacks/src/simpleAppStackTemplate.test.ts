import { Deployment } from 'kubernetes-models/apps/v1/Deployment';
import { Service } from 'kubernetes-models/v1/Service';
import { describe, it, expect } from 'vitest';

import { simpleAppStackTemplate } from './simpleAppStackTemplate.js';

describe('simpleAppStackTemplate', () => {
  it('should generate Deployment and Service with defaults', () => {
    const result = simpleAppStackTemplate.create({
      name: 'my-app',
      imageName: 'my-app',
    });

    expect(result.deployment).toBeInstanceOf(Deployment);
    expect(result.service).toBeInstanceOf(Service);

    const { deployment, service } = result;

    expect(deployment.metadata?.name).toBe('my-app');
    expect(deployment.spec?.replicas).toBe(1);
    expect(deployment.spec?.template.spec?.containers[0].image).toBe('my-app');
    expect(deployment.spec?.template.spec?.containers[0].ports?.[0].containerPort).toBe(80);

    expect(service.metadata?.name).toBe('my-app');
    expect(service.spec?.ports?.[0].port).toBe(80);
    expect(service.spec?.selector).toEqual({ app: 'my-app' });
  });

  it('should override defaults if values provided', () => {
    const result = simpleAppStackTemplate.create({
      name: 'my-app',
      imageName: 'custom-image',
      imageRegistry: 'docker.io',
      port: 3000,
      replicas: 5,
    });

    const { deployment, service } = result;

    expect(deployment.spec?.replicas).toBe(5);
    expect(deployment.spec?.template.spec?.containers[0].image).toBe('docker.io/custom-image');
    expect(deployment.spec?.template.spec?.containers[0].ports?.[0].containerPort).toBe(3000);
    expect(service.spec?.ports?.[0].port).toBe(3000);
  });
});
