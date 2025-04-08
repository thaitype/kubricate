import type { PreparedEffect } from '../providers/BaseProvider.js';
import { SecretManagerEngine } from './SecretManagerEngine.js';
import type { SecretsOrchestratorOptions } from './types.js';

export class SecretsOrchestrator {

  constructor(private engine: SecretManagerEngine) {}

  static create(options: SecretsOrchestratorOptions): SecretsOrchestrator {
    const engine = new SecretManagerEngine(options);
    return new SecretsOrchestrator(engine);
  }

  /**
   * Validates all secret managers by resolving and loading all declared secrets.
   *
   * @remarks
   * Used by: `kubricate secret validate`
   *
   * @description
   * Ensures each secret manager is correctly configured by:
   * - Collecting all managers from config
   * - Resolving loaders
   * - Attempting to load each secret once
   * Logs debug information throughout for traceability.
   *
   * @returns Resolves when all managers validate without throwing.
   *
   * @throws If a loader fails or a secret cannot be loaded.
   */
  async validate(): Promise<void> {
    const managers = this.engine.collect();
    await this.engine.validate(managers);
  }

  /**
   * Prepares all resolved secret values as effects ready to be applied to Kubernetes.
   *
   * @remarks
   * Used by: `kubricate secret apply`
   *
   * @description
   * This method:
   * - Loads and deduplicates all secrets from configured loaders
   * - Resolves appropriate provider for each secret
   * - Generates `PreparedEffect[]` for application (e.g. kubectl manifest)
   *
   * @returns A list of prepared secret effects
   *
   * @throws If loading or provider preparation fails
   */
  async apply(): Promise<PreparedEffect[]> {
    const managers = this.engine.collect();
    return this.engine.prepareEffects(managers)
  }

}
