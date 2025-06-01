import { describe, expect, test } from 'vitest';

import { ResourceAllocator } from './resource-allocator.js'; // Adjust the path as needed

describe('ResourceAllocator', () => {
  const inputResources = { cpu: 0.6, memory: 1.0 }; // 0.6 cores, 1 GiB memory

  test('Conservative preset should allocate 50% for requests and 100% for limits', () => {
    const allocator = new ResourceAllocator('conservative');
    const resources = allocator.computeResources(inputResources);

    expect(resources.requests.cpu).toBe('300m');
    expect(resources.requests.memory).toBe('512Mi');
    expect(resources.limits.cpu).toBe('600m');
    expect(resources.limits.memory).toBe('1024Mi');
  });

  test('Optimized preset should allocate 70% for requests and 130% for limits', () => {
    const allocator = new ResourceAllocator('optimized');
    const resources = allocator.computeResources(inputResources);

    expect(resources.requests.cpu).toBe('420m');
    expect(resources.requests.memory).toBe('717Mi');
    expect(resources.limits.cpu).toBe('780m');
    expect(resources.limits.memory).toBe('1331Mi');
  });

  test('Aggressive preset should allocate 100% for requests and 200% for limits', () => {
    const allocator = new ResourceAllocator('aggressive');
    const resources = allocator.computeResources(inputResources);

    expect(resources.requests.cpu).toBe('600m');
    expect(resources.requests.memory).toBe('1024Mi');
    expect(resources.limits.cpu).toBe('1200m');
    expect(resources.limits.memory).toBe('2048Mi');
  });

  test('Handles zero input correctly', () => {
    const allocator = new ResourceAllocator('optimized');
    const resources = allocator.computeResources({ cpu: 0, memory: 0 });

    expect(resources.requests.cpu).toBe('0m');
    expect(resources.requests.memory).toBe('0Mi');
    expect(resources.limits.cpu).toBe('0m');
    expect(resources.limits.memory).toBe('0Mi');
  });

  test('Handles small fractional CPU values', () => {
    const allocator = new ResourceAllocator('conservative');
    const resources = allocator.computeResources({ cpu: 0.1, memory: 1 });

    expect(resources.requests.cpu).toBe('50m'); // 0.1 * 1000 * 0.5
    expect(resources.limits.cpu).toBe('100m'); // 0.1 * 1000 * 1.0
  });
});
