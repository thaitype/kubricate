import { type BaseLogger } from '@kubricate/core';
import type { GlobalConfigOptions } from '../internal/types.js';
import type { KubectlExecutor } from '../executor/kubectl-executor.js';
import { MARK_CHECK } from '../internal/constant.js';
import c from 'ansis';
import { BaseCommand } from './base.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SecretsCommandOptions extends GlobalConfigOptions {}

export class SecretsCommand extends BaseCommand {
  constructor(
    protected options: GlobalConfigOptions,
    protected logger: BaseLogger,
    protected kubectl: KubectlExecutor
  ) {
    super(options, logger);
  }

  async validate() {
    this.logger.info('Validating secrets configuration...');
    const { orchestrator } = await this.init();
    await orchestrator.validate();
    this.logger.log(c.green`${MARK_CHECK} All secret managers validated successfully.`);
  }

  async apply() {
    const { orchestrator } = await this.init();
    await orchestrator.validate();

    const effects = await orchestrator.prepare();
    if (effects.length === 0) {
      this.logger.warn(`No secrets to apply.`);
      return;
    }
    for (const effect of effects) {
      if (effect.type === 'kubectl') {
        const name = effect.value?.metadata?.name ?? 'unnamed';
        this.logger.info(`Applying secret: ${name}`);
        await this.kubectl.apply(effect.value);
        this.logger.log(c.green`${MARK_CHECK} Applied: ${name}`);
      }
    }

    this.logger.log(c.green`${MARK_CHECK} All secrets applied successfully.`);
  }
}
