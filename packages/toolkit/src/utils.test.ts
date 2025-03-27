import { test, expect } from 'vitest';
import { joinPath } from './utils.js';

test('test regular joinPath', () => {
  expect(joinPath('', 'b')).toBe('b');
  expect(joinPath('a', 'b', 'c')).toBe('a/b/c');
  expect(joinPath('/a', 'b', 'c')).toBe('a/b/c');
  expect(joinPath('/a/', 'b', 'c')).toBe('a/b/c');
  expect(joinPath('/a/', '/b/', '/c/')).toBe('a/b/c');
  expect(joinPath('/a/', '/b/', '/c')).toBe('a/b/c');
  expect(joinPath('/a', '/b', '/c')).toBe('a/b/c');
});

test('test imageUri joinPath', () => {
  expect(joinPath('docker.io', 'my-image')).toBe('docker.io/my-image');
  expect(joinPath('docker.io', 'my-image:latest')).toBe('docker.io/my-image:latest');
});
