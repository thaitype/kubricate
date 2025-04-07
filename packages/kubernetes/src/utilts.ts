import { ZodSchema } from "zod";
import { ValidationError } from "zod-validation-error";

export function parseZodSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      throw new Error(`Validation error: ${error.message}`);
    }
    throw error;
  }
}
