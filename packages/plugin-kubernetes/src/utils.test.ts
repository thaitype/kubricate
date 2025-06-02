import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseZodSchema } from './utils.js';

describe('parseZodSchema', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().int().positive(),
  });

  it('should return parsed data when valid', () => {
    const input = { name: 'Alice', age: 30 };
    const result = parseZodSchema(schema, input);
    expect(result).toEqual(input);
  });

  it('should throw formatted error when data is invalid', () => {
    const invalidInput = { name: 'Alice', age: -5 };

    expect(() => parseZodSchema(schema, invalidInput)).toThrowError(/Validation error:/);
  });

  it("should throw error as-is if it's not a ZodError", () => {
    const mockSchema = {
      parse: () => {
        throw new Error('some other error');
      },
    } as unknown as typeof schema;

    expect(() => parseZodSchema(mockSchema, {})).toThrowError('some other error');
  });
});
