import { ZodError, ZodSchema } from 'zod';
import { fromZodError } from 'zod-validation-error';

export function parseZodSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw new Error(`Validation error: ${fromZodError(error).message}`);
    }
    throw error;
  }
}
