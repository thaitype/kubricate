import { getConfig } from '../load-config.js';
import { SecretsOrchestrator, type BaseLogger } from '@kubricate/core';
import type { GlobalConfigOptions } from '../types.js';
import type { KubectlExecutor } from '../executor/kubectl-executor.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SecretsCommandOptions extends GlobalConfigOptions {}

export class SecretsCommand {
  private configLoaded = false;
  private orchestrator!: SecretsOrchestrator;

  constructor(
    private options: GlobalConfigOptions,
    private logger: BaseLogger,
    private kubectl: KubectlExecutor
  ) {}

  private async init(): Promise<SecretsOrchestrator> {
    if (!this.configLoaded) {
      const config = await getConfig(this.options);
      if (!config) {
        this.logger.error('No configuration found.');
        process.exit(1);
      }
      this.orchestrator = new SecretsOrchestrator(config, this.logger);
      this.configLoaded = true;
    }
    return this.orchestrator;
  }

  async validate() {
    const orchestrator = await this.init();
    await orchestrator.validate();
  }

  async apply() {
    const orchestrator = await this.init();
    await orchestrator.validate();

    const effects = await orchestrator.prepare();
    for (const effect of effects) {
      if (effect.type === 'kubectl') {
        const name = effect.value?.metadata?.name ?? 'unnamed';
        this.logger.info(`Applying secret: ${name}`);
        await this.kubectl.apply(effect.value);
        this.logger.info(`✅ Applied: ${name}`);
      }
    }

    this.logger.info('✅ All secrets applied successfully.');
  }
}
