import { expect, it, describe } from 'vitest';

import { shared } from './shared.js';

describe('shared', () => {
  it('should work', () => {
    expect(shared()).toEqual('shared');
  });
});
