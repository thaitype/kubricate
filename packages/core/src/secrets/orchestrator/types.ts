
import type { KubricateConfig, BaseLogger } from '../../types.js';

export interface SecretsOrchestratorOptions {
  config: KubricateConfig;
  effectOptions: EffectsOptions;
  logger: BaseLogger;
}

export interface EffectsOptions {
  workingDir?: string;
}
