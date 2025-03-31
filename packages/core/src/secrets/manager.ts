import type { KubricateConfig } from '../types.js';
import type { SecretManager } from './SecretManager.js';
import type { PreparedEffect } from './providers/BaseProvider.js';

export type StackName = string;
export type SecretManagerName = string;

export interface MergedSecretManager {
  [stackAndName: string]: {
    /**
     * The name of the secret manager.
     * This is used to identify the secret manager in the stack.
     *
     * However, it can duplicate when multiple stacks are used.
     */
    name: string;
    /**
     * Stack name where the secret manager is used.
     * This is used to identify the stack in the kubricate config.
     *
     * This value should be unique across all stacks.
     */
    stackName: string;
    /**
     * The secret manager instance.
     */
    secretManager: SecretManager;
  };
}

/**
 * Collect all SecretManager instances from config.stacks
 */
export function collectSecretManagers(config: KubricateConfig): MergedSecretManager {
  const result: MergedSecretManager = {};

  for (const [stackName, stack] of Object.entries(config.stacks ?? {})) {
    if (typeof stack.getSecretManagers === 'function') {
      const managers = stack.getSecretManagers();
      for (const [name, secretManager] of Object.entries(managers)) {
        const id = `${stackName}.${name}`;
        if (!result[id]) {
          result[id] = { name, stackName, secretManager };
        }
      }
    }
  }

  return result;
}

/**
 * Validate all loaders by attempting to load secrets
 */
export async function validateSecretManagers(managers: MergedSecretManager): Promise<void> {
  for (const entry of Object.values(managers)) {
    const secrets = entry.secretManager.getSecrets();
    for (const name of Object.keys(secrets)) {
      const loader = entry.secretManager.resolveLoader(secrets[name].loader);
      await loader.load([name]);
      loader.get(name); // throws if not found
    }
  }
}

/**
 * Prepare all effects across all providers
 */
export async function prepareSecretEffects(managers: MergedSecretManager): Promise<PreparedEffect[]> {
  const effects: PreparedEffect[] = [];

  for (const entry of Object.values(managers)) {
    const secretManager = entry.secretManager;
    const secrets = secretManager.getSecrets();
    const resolved: Record<string, string> = {};
    const loaded = new Set<string>();

    for (const name of Object.keys(secrets)) {
      if (!loaded.has(name)) {
        const loader = secretManager.resolveLoader(secrets[name].loader);
        await loader.load([name]);
        resolved[name] = loader.get(name);
        loaded.add(name);
      }
    }

    for (const name of Object.keys(secrets)) {
      const provider = secretManager.resolveProvider(secrets[name].provider);
      effects.push(...provider.prepare(name, resolved[name]));
    }
  }

  return effects;
}
