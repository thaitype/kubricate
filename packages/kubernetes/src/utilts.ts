import type { BaseLogger, MergeCandidate, MergeSecretsContext, SecretValue } from "@kubricate/core";
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

interface KubernetesMergeHandlerOptions {
  logger?: BaseLogger;
}

export function createKubernetesMergeHandler(options: KubernetesMergeHandlerOptions): (context: MergeSecretsContext) => Record<string, SecretValue> {
  return (context) => {
    const { logger } = options;
    const { level, configValue, candidates } = context;

    const grouped = new Map<string, MergeCandidate>();

    for (const candidate of candidates) {
      const prev = grouped.get(candidate.key);
      if (prev && prev.value !== candidate.value) {
        const msg = `[Kubernetes Merge] Conflict on key "${candidate.key}" at ${level}: ` +
          `from stack ${prev.source.stackId} ≠ ${candidate.source.stackId}`;

        if (configValue === 'error') throw new Error(msg);
        if (configValue === 'warn') logger?.warn?.(msg);
      }

      grouped.set(candidate.key, candidate);
    }

    const merged: Record<string, SecretValue> = {};
    for (const [key, item] of grouped) {
      merged[key] = item.value;
    }

    return merged;
  };
}
