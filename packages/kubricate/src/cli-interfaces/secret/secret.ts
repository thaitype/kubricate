import type { CommandModule } from 'yargs';
import { secretValidateCommand } from './validate.js';
import { secretApplyCommand } from './apply.js';

export const secretCommand: CommandModule = {
  command: 'secret [command]',
  describe: 'Manage secrets with SecretManager',
  builder: yargs =>
    yargs
      // Add subcommands
      .command(secretValidateCommand)
      .command(secretApplyCommand)
      // Show help if no subcommand is provided
      .demandCommand(1, ''),
  handler: () => {},
};
