import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import { GenerateCommand, type GenerateCommandOptions } from '../commands/generate.js';
import type { GlobalConfigOptions } from '../types.js';
import { ConsoleLogger } from '../logger.js';

export const generateCommand: CommandModule<GlobalConfigOptions, GenerateCommandOptions> = {
  command: 'generate',
  describe: 'Generate a stack into yaml files',
  builder: yargs =>
    yargs.option('outDir', {
      type: 'string',
      describe: 'Output directory',
      default: '.kubricate',
    }),
  handler: async (argv: ArgumentsCamelCase<GenerateCommandOptions>) => {
    const logger = argv.logger ?? new ConsoleLogger();
    await new GenerateCommand(argv, logger).execute();
  },
};
