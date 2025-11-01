import c from 'ansis';

import { type BaseLogger } from '@kubricate/core';

import type { KubectlExecutor } from '../executor/kubectl-executor.js';
import { MARK_CHECK } from '../internal/constant.js';
import type { GlobalConfigOptions } from '../internal/types.js';
import { censorSecretPayload } from '../internal/utils.js';
import type { SecretsOrchestrator } from '../secret/index.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SecretCommandOptions extends GlobalConfigOptions {}

export class SecretCommand {
  constructor(
    protected options: GlobalConfigOptions,
    protected logger: BaseLogger,
    protected kubectl: KubectlExecutor
  ) {}

  async validate(orchestrator: SecretsOrchestrator) {
    this.logger.info('Validating secrets configuration...');
    await orchestrator.validate();
    this.logger.log(c.green`${MARK_CHECK} All secret managers validated successfully.`);
  }

  async apply(orchestrator: SecretsOrchestrator) {
    await orchestrator.validate();

    const effects = await orchestrator.apply();
    if (effects.length === 0) {
      this.logger.warn(`No secrets to apply.`);
      return;
    }
    for (const effect of effects) {
      if (effect.type === 'kubectl') {
        const name = effect.value?.metadata?.name ?? 'unnamed';
        this.logger.info(`Applying secret: ${name}`);
        if (this.options.dryRun) {
          const censoredPayload = censorSecretPayload(effect.value);
          this.logger.log(
            c.yellow`${MARK_CHECK} [DRY RUN] Would apply: ${name} with kubectl using payload: ${JSON.stringify(censoredPayload)}`
          );
        } else {
          await this.kubectl.apply(effect.value);
        }
        this.logger.log(c.green`${MARK_CHECK} Applied: ${name}`);
      }
    }

    this.logger.log(c.green`${MARK_CHECK} All secrets applied successfully.`);
  }
}
