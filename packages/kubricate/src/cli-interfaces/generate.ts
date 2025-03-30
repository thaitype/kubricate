import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import { GenerateCommand, type GenerateCommandOptions } from '../commands/generate.js';
import type { GlobalConfigOptions } from '../types.js';
import { ConsoleLogger } from '../logger.js';
import { handlerError } from '../error.js';
import { verboseCliConfig } from '../utils.js';

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
    try {
      verboseCliConfig(argv, logger, 'generate');
      await new GenerateCommand(argv, logger).execute();
    } catch (error) {
      handlerError(error, logger);
    }
  },
};
