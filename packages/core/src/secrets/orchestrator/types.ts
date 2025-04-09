
import type { KubricateConfig, BaseLogger } from '../../types.js';

export interface SecretsOrchestratorOptions {
  config: KubricateConfig;
  effectOptions: EffectsOptions;
  logger: BaseLogger;
}

export interface EffectsOptions {
  workingDir?: string;
}

export type MergeLevel =
  | 'providerLevel'
  | 'managerLevel'
  | 'stackLevel'
  | 'workspaceLevel';

export type MergeStrategy =
  | 'skip'
  | 'warn'
  | 'overwrite'
  | 'error'
  | 'autoMerge';
