import type { CommandModule } from 'yargs';

import type { GlobalConfigOptions } from '../../internal/types.js';

import { ConfigLoader } from '../../commands/ConfigLoader.js';
import { SecretCommand, type SecretCommandOptions } from '../../commands/SecretCommand.js';
import { ExecaExecutor } from '../../executor/execa-executor.js';
import { KubectlExecutor } from '../../executor/kubectl-executor.js';
import { handlerError } from '../../internal/error.js';
import { ConsoleLogger } from '../../internal/logger.js';

export const secretApplyCommand: CommandModule<GlobalConfigOptions, SecretCommandOptions> = {
  command: 'apply',
  describe: 'Apply secrets to the target provider (e.g., kubectl)',
  handler: async argv => {
    const logger = argv.logger ?? new ConsoleLogger();
    try {
      const executor = new KubectlExecutor('kubectl', logger, new ExecaExecutor());

      const configLoader = new ConfigLoader(argv, logger);
      const { orchestrator } = await configLoader.initialize({
        subject: 'secret apply',
        commandOptions: argv,
      });

      await new SecretCommand(argv, logger, executor).apply(orchestrator);
    } catch (error) {
      handlerError(error, logger);
    }
  },
};
