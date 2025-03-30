import { getConfig } from '../load-config.js';
import { SecretsOrchestrator, type BaseLogger, type KubricateConfig } from '@kubricate/core';
import type { GlobalConfigOptions } from '../types.js';
import type { KubectlExecutor } from '../executor/kubectl-executor.js';
import { MARK_CHECK } from '../constant.js';
import c from 'ansis';

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

  private injectLogger(config: KubricateConfig) {
    for (const stack of Object.values(config.stacks ?? {})) {
      if (stack.logger) {
        stack.logger = this.logger;
      }
    }
  }

  private async init(): Promise<SecretsOrchestrator> {
    this.logger.debug('Initializing secrets orchestrator...');
    if (!this.configLoaded) {
      const config = await getConfig(this.options);
      if (!config) {
        this.logger.error('No configuration found.');
        process.exit(1);
      }
      this.logger.debug('Configuration loaded: ' + JSON.stringify(config, null, 2));
      this.logger.debug('Injecting logger into stacks...');
      this.injectLogger(config);
      this.logger.debug('Injected logger into stacks.');
      this.logger.debug('Creating secrets orchestrator...');
      this.orchestrator = new SecretsOrchestrator(config, this.logger);
      this.logger.debug('Secrets orchestrator created.');
      this.configLoaded = true;
    }
    return this.orchestrator;
  }

  async validate() {
    this.logger.info('Validating secrets configuration...');
    const orchestrator = await this.init();
    await orchestrator.validate();
    this.logger.log(c.green`${MARK_CHECK} All secret managers validated successfully.`);
  }

  async apply() {
    const orchestrator = await this.init();
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
