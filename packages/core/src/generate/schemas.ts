import { z } from 'zod';

export const GenerateHashCacheSchema = z.object({
  version: z.literal(1),

  outputMode: z.enum(['flat', 'stack', 'resource']),

  generatedAt: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid ISO date format for generatedAt' }
  ),

  files: z.record(
    z.string(),  // relative file path
    z.string().regex(/^[a-f0-9]{64}$/, { message: 'Invalid SHA-256 hash' })
  )
});

export type GenerateHashCache = z.infer<typeof GenerateHashCacheSchema>;
