import type { CommandModule } from 'yargs';
import { SecretsCommand, type SecretsCommandOptions } from '../../commands/secrets.js';
import { logger } from '../../bootstrap.js';
import type { GlobalConfigOptions } from '../../load-config.js';
import { KubectlExecutor } from '../../executor/kubectl-executor.js';
import { ExecaExecutor } from '../../executor/execa-executor.js';

export const secretsValidateCommand: CommandModule<GlobalConfigOptions, SecretsCommandOptions> = {
  command: 'validate',
  describe: 'Validate secret manager configuration',
  handler: async argv => {
    const executor = new KubectlExecutor('kubectl', logger, new ExecaExecutor());
    await new SecretsCommand(argv, logger, executor).validate();
  },
};
