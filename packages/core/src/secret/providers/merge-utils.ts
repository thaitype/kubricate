import type { PreparedEffect } from "./BaseProvider.js";

/**
 * Creates a reusable handler to merge multiple Raw Secret effects.
 * Will group by Secret `storeName` and merge `.data`.
 * Throws error if duplicate keys are found within the same store.
 */
export function createMergeHandler(): (effects: PreparedEffect[]) => PreparedEffect[] {
  return function mergeKubeSecrets(effects: PreparedEffect[]): PreparedEffect[] {
    const grouped: Record<string, PreparedEffect> = {};

    for (const effect of effects) {
      if (effect.type !== 'custom') continue;

      const name = effect.value.storeName;
      const key = name;

      if (!grouped[key]) {
        grouped[key] = {
          ...effect,
          value: {
            ...effect.value,
            rawData: { ...effect.value.rawData },
          },
        };
        continue;
      }

      const existing = grouped[key];

      for (const [key, value] of Object.entries(effect.value.rawData ?? {})) {
        if (existing.value.rawData?.[key]) {
          throw new Error(`[conflict:in-memory] Conflict detected: key "${key}" already exists in Secret "${name}"`);
        }
      
        existing.value.rawData[key] = value;
      }
    }
    return Object.values(grouped);
  };
}