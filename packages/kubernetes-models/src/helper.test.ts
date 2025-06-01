/* eslint-disable @typescript-eslint/no-explicit-any */
// test/kubeModel.test.ts
import { describe, it, expect } from 'vitest';

import { kubeModel } from './helper.js';

class MockModel {
  constructor(public config: any) {}
  toJSON() {
    return { ...this.config, kind: 'MockModel' };
  }
}

class NoToJSONModel {
  constructor(public config: any) {}
}

describe('kubeModel', () => {
  it('should convert class instance to plain object using toJSON()', () => {
    const result = kubeModel(MockModel, {
      metadata: { name: 'test' },
    });

    expect(result).toEqual({
      metadata: { name: 'test' },
      kind: 'MockModel',
    });

    expect(result).not.toBeInstanceOf(MockModel);
  });

  it('should throw error if class does not implement toJSON()', () => {
    expect(() =>
      kubeModel(NoToJSONModel as any, { metadata: { name: 'fail' } })
    ).toThrowError('[kubeModel] NoToJSONModel does not implement .toJSON()');
  });

  it('should deeply clone the object and not share reference', () => {
    const input = {
      metadata: { name: 'original' },
    };

    const result = kubeModel(MockModel, input);
    result.metadata.name = 'mutated';

    expect(input.metadata.name).toBe('original');
  });
});