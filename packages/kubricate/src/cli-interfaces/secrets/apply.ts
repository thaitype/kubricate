import type { CommandModule } from 'yargs';
import type { GlobalConfigOptions } from '../../load-config.js';
import { SecretsCommand, type SecretsCommandOptions } from '../../commands/secrets.js';
import { logger } from '../../bootstrap.js';
import { ExecaExecutor } from '../../executor/execa-executor.js';
import { KubectlExecutor } from '../../executor/kubectl-executor.js';

export const secretsApplyCommand: CommandModule<GlobalConfigOptions, SecretsCommandOptions> = {
  command: 'apply',
  describe: 'Apply secrets to the target provider (e.g., kubectl)',
  handler: async argv => {
    console.log('🔐 Applying secrets...');
    console.log(`Root: ${argv.root}`);
    console.log(`Config: ${argv.config}`);
    const executor = new KubectlExecutor('kubectl', logger, new ExecaExecutor());
    await new SecretsCommand(argv, logger, executor).apply();
  },
};
