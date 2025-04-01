import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import { GenerateCommand, type GenerateCommandOptions } from '../commands/generate.js';
import type { GlobalConfigOptions } from '../internal/types.js';
import { ConsoleLogger } from '../internal/logger.js';
import { handlerError } from '../internal/error.js';
import { verboseCliConfig } from '../internal/utils.js';

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
