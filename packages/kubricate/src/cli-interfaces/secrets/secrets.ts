import type { CommandModule } from 'yargs';
import { secretsValidateCommand } from './validate.js';
import { secretsApplyCommand } from './apply.js';

export const secretsCommand: CommandModule = {
  command: 'secrets [command]',
  describe: 'Manage secrets with SecretManager',
  builder: yargs =>
    yargs
      // Add subcommands
      .command(secretsValidateCommand)
      .command(secretsApplyCommand)
      // Show help if no subcommand is provided
      .demandCommand(1, ''),
  handler: () => {},
};
