import type { SecretValue } from "../types.js";
import type { KubricateConfig, BaseLogger } from '../../types.js';
import { isObject } from "lodash-es";
import type { MergeLevel, MergeStrategy } from "./types.js";

export interface SecretOrigin {
  key: string;
  value: SecretValue;
  source: 'loader' | 'provider';
  providerName: string;
  managerName: string;
  stackName: string;
  originPath: string[]; // e.g., ['workspace', 'stack:auth', 'manager:vault']
};


export class SecretMergeEngine {
  constructor(
    private readonly logger: BaseLogger,
    private readonly context: {
      config: KubricateConfig;
      stackName: string;
      managerName: string;
    }
  ) { }

  /**
   * Top-level entry to perform merge of raw secret values
   * using the configured merge strategy.
   *
   * This is invoked after all secrets have been loaded,
   * before passing them to the provider for rendering.
   */
  merge(secrets: SecretOrigin[]): Record<string, SecretValue> {
    const merged: Record<string, SecretValue> = {};
    const history = new Map<string, SecretOrigin[]>();

    for (const current of secrets) {
      const key = current.key;
      const prevEntries = history.get(key) ?? [];

      if (prevEntries.length === 0) {
        this.setMergedValue(merged, history, key, current);
        continue;
      }

      const level = this.resolveConflictLevel(prevEntries[0], current);
      const strategy = this.resolveStrategyForLevel(level);

      this.applyMergeStrategy({ key, current, prevEntries, strategy, level, merged, history });
    }

    return merged;
  }

  private applyMergeStrategy(params: {
    key: string;
    current: SecretOrigin;
    prevEntries: SecretOrigin[];
    strategy: MergeStrategy;
    level: MergeLevel;
    merged: Record<string, SecretValue>;
    history: Map<string, SecretOrigin[]>;
  }) {
    const { key, current, prevEntries, strategy, level, merged, history } = params;

    const prevVal = merged[key];

    switch (strategy) {
      case 'skip':
        this.logger.debug(`[merge:skip:${level}] Skipping ${key}`);
        return;

      case 'warn':
        this.logger.warn(`[merge:warn:${level}] Duplicate key "${key}" detected. Keeping first.`);
        return;

      case 'overwrite':
        this.logger.info(`[merge:overwrite:${level}] Overwriting key "${key}"`);
        merged[key] = current.value;
        history.set(key, [...prevEntries, current]);
        return;

      case 'autoMerge':
        if (isObject(prevVal) && isObject(current.value)) {
          merged[key] = { ...prevVal, ...current.value };
        } else {
          merged[key] = current.value;
        }
        history.set(key, [...prevEntries, current]);
        return;

      case 'error':
        throw new Error(`[merge:error:${level}] Duplicate key "${key}" from ${current.originPath.join(' > ')}`);
    }
  }


  private setMergedValue(
    merged: Record<string, SecretValue>,
    history: Map<string, SecretOrigin[]>,
    key: string,
    entry: SecretOrigin
  ) {
    merged[key] = entry.value;
    history.set(key, [entry]);
  }

  private resolveConflictLevel(a: SecretOrigin, b: SecretOrigin): MergeLevel {
    if (a.stackName !== b.stackName) return 'workspaceLevel';
    if (a.managerName !== b.managerName) return 'stackLevel';
    if (a.providerName !== b.providerName) return 'managerLevel';
    return 'providerLevel';
  }

  private resolveStrategyForLevel(level: MergeLevel): MergeStrategy {
    return (
      this.context.config.secrets?.kubernetes?.merge?.[level] ??
      'autoMerge'
    );
  }
}
