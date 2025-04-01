import type { CommandModule } from 'yargs';
import { SecretsCommand, type SecretsCommandOptions } from '../../commands/secrets.js';
import { KubectlExecutor } from '../../executor/kubectl-executor.js';
import { ExecaExecutor } from '../../executor/execa-executor.js';
import type { GlobalConfigOptions } from '../../internal/types.js';
import { ConsoleLogger } from '../../internal/logger.js';
import { handlerError } from '../../internal/error.js';
import { verboseCliConfig } from '../../internal/utils.js';

export const secretsValidateCommand: CommandModule<GlobalConfigOptions, SecretsCommandOptions> = {
  command: 'validate',
  describe: 'Validate secret manager configuration',
  handler: async argv => {
    const logger = argv.logger ?? new ConsoleLogger();
    try {
      verboseCliConfig(argv, logger, 'secrets validate');
      const executor = new KubectlExecutor('kubectl', logger, new ExecaExecutor());
      await new SecretsCommand(argv, logger, executor).validate();
    } catch (error) {
      handlerError(error, logger);
    }
  },
};
