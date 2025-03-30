import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import { logger } from '../bootstrap.js';
import { GenerateCommand, type GenerateCommandOptions } from '../commands/generate.js';
import type { GlobalConfigOptions } from '../types.js';

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
    await new GenerateCommand(argv, logger).execute();
  },
};
