import type { SecretManager } from '@kubricate/core';
import type { KubricateConfig } from '../config.js';
import { getConfig } from '../load-config.js';
import type { BaseLogger } from '../logger.js';
import type { KubectlExecutor } from '../executor/kubectl-executor.js';
import type { GlobalConfigOptions } from '../types.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SecretsCommandOptions extends GlobalConfigOptions {}

export type StackName = string;

export type MergedSecretManager = Record<
  StackName,
  {
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
  }
>;

export class SecretsCommand {
  private config?: KubricateConfig;

  constructor(
    private options: SecretsCommandOptions,
    private logger: BaseLogger,
    private readonly kubectl: KubectlExecutor
  ) {}

  async getConfig(): Promise<KubricateConfig> {
    if (!this.config) {
      this.config = await getConfig(this.options, this.logger);
      if (!this.config) {
        this.logger.error('No configuration found');
        process.exit(1);
      }
    }
    return this.config;
  }

  private getSecretManagerId(stackName: string, secretManagerName: string): string {
    return `${stackName}.${secretManagerName}`;
  }

  async getSecretManagers(): Promise<MergedSecretManager> {
    const config = await this.getConfig();
    const result: MergedSecretManager = {};

    for (const [stackName, stack] of Object.entries(config.stacks ?? {})) {
      if (typeof stack.getSecretManagers === 'function') {
        const managers = stack.getSecretManagers();
        for (const [name, secretManager] of Object.entries(managers)) {
          const id = this.getSecretManagerId(stackName, name);
          if (result[id]) {
            this.logger.warn(`⚠️ Duplicate secret manager detected: ${id}`);
            continue;
          }
          result[id] = {
            name,
            stackName,
            secretManager,
          };
        }
      }
    }

    return result;
  }

  async validate() {
    this.logger.info('🔍 Validating secrets...');
    const managers = await this.getSecretManagers();

    for (const [id, { secretManager }] of Object.entries(managers)) {
      try {
        await secretManager.prepare(); // triggers loader.load internally
        this.logger.log(`✅ Validated: ${id}`);
      } catch (err) {
        this.logger.error(`❌ Validation failed: ${id}: ${(err as Error).message}`);
        process.exit(1);
      }
    }
  }

  async apply() {
    await this.validate();

    const managers = await this.getSecretManagers();
    this.logger.info('🚀 Applying secrets via kubectl...');

    for (const [id, { secretManager }] of Object.entries(managers)) {
      const effects = await secretManager.prepare();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const { name, value, effects: prepared } of effects) {
        for (const effect of prepared) {
          if (effect.type !== 'kubectl') continue;

          this.logger.info(`📦 Applying secret '${name}' for ${id}`);
          await this.kubectl.applyManifest(effect.value);
        }
      }
    }

    this.logger.log('🎉 All secrets applied via kubectl');
  }
}
