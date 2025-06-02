import { describe, expect, it, test } from 'vitest';

import { joinPath, mergeMetadata } from './utils.js';

describe('joinPath', () => {
  test('test regular joinPath', () => {
    expect(joinPath('', 'b')).toBe('b');
    expect(joinPath('a', 'b', 'c')).toBe('a/b/c');
    expect(joinPath('/a', 'b', 'c')).toBe('a/b/c');
    expect(joinPath('/a/', 'b', 'c')).toBe('a/b/c');
    expect(joinPath('/a/', '/b/', '/c/')).toBe('a/b/c');
    expect(joinPath('/a/', '/b/', '/c')).toBe('a/b/c');
    expect(joinPath('/a', '/b', '/c')).toBe('a/b/c');
    expect(joinPath('/a/xxx', 'b', '/c')).toBe('a/xxx/b/c');
    expect(joinPath('docker.io', 'test/aaa:ccc')).toBe('docker.io/test/aaa:ccc');
  });

  test('test imageUri joinPath', () => {
    expect(joinPath('docker.io', 'my-image')).toBe('docker.io/my-image');
    expect(joinPath('docker.io', 'my-image:latest')).toBe('docker.io/my-image:latest');
  });
});

describe('mergeMetadata', () => {
  it('returns merged labels metadata when input has data', () => {
    const input = { foo: 'bar' };
    const result = mergeMetadata('labels', input);
    expect(result).toEqual({ labels: { foo: 'bar' } });
  });

  it('returns merged annotations metadata when input has data', () => {
    const input = { hello: 'world' };
    const result = mergeMetadata('annotations', input);
    expect(result).toEqual({ annotations: { hello: 'world' } });
  });

  it('returns undefined when input is empty', () => {
    const result = mergeMetadata('labels', {});
    expect(result).toBeUndefined();
  });
});
