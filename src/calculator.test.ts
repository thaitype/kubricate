import { test, expect } from 'bun:test';
import { add } from './calculator.js';

test('libs', () => {
  expect(add(1, 2)).toBe(3);
});