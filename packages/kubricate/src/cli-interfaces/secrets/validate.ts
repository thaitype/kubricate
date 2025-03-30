import type { CommandModule } from 'yargs';
import { SecretsCommand, type SecretsCommandOptions } from '../../commands/secrets.js';
import { KubectlExecutor } from '../../executor/kubectl-executor.js';
import { ExecaExecutor } from '../../executor/execa-executor.js';
import type { GlobalConfigOptions } from '../../types.js';
import { ConsoleLogger } from '../../logger.js';
import a from 'ansis';

export const secretsValidateCommand: CommandModule<GlobalConfigOptions, SecretsCommandOptions> = {
  command: 'validate',
  describe: 'Validate secret manager configuration',
  handler: async argv => {
    const logger = argv.logger ?? new ConsoleLogger();
    try {
      const executor = new KubectlExecutor('kubectl', logger, new ExecaExecutor());
      await new SecretsCommand(argv, logger, executor).validate();
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error validating secrets: ${error.message}`);
        if (argv.verbose == true) {
          logger.error(a.red('Error stack trace:'));
          logger.error(error.stack ?? 'Unknown error stack');
        }
      } else {
        logger.error(`Error validating secrets: ${error}`);
      }
      process.exit(1);
    }
  },
};
