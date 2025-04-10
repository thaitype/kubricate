import type { PreparedEffect } from "@kubricate/core";

/**
 * Creates a reusable handler to merge multiple Kubernetes Secret effects.
 * Will group by Secret `metadata.name` + `namespace` and merge `.data`.
 * Throws error if duplicate keys are found within the same Secret.
 */
export function createKubernetesMergeHandler(): (effects: PreparedEffect[]) => PreparedEffect[] {
  return function mergeKubeSecrets(effects: PreparedEffect[]): PreparedEffect[] {
    const grouped: Record<string, PreparedEffect> = {};

    for (const effect of effects) {
      if (effect.type !== 'kubectl' || effect.value.kind !== 'Secret') continue;

      const name = effect.value.metadata?.name;
      const namespace = effect.value.metadata?.namespace ?? 'default';
      const key = `${namespace}/${name}`;

      if (!grouped[key]) {
        grouped[key] = {
          ...effect,
          value: {
            ...effect.value,
            data: { ...effect.value.data },
          },
        };
        continue;
      }

      const existing = grouped[key];

      for (const [k, v] of Object.entries(effect.value.data ?? {})) {
        if (existing.value.data?.[k]) {
          throw new Error(`[merge:k8s] Conflict detected: key "${k}" already exists in Secret "${name}" in namespace "${namespace}"`);
        }

        existing.value.data[k] = v;
      }
    }

    return Object.values(grouped);
  };
}