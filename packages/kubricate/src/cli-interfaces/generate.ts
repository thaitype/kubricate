import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import { logger } from '../bootstrap.js';
import { GenerateCommand, type GenerateCommandOptions } from '../commands/generate.js';

export const generateCommand: CommandModule<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {}, // global args (none for now)
  GenerateCommandOptions
> = {
  command: 'generate',
  describe: 'Generate a stack into yaml files',
  builder: yargs =>
    yargs
      .option('root', {
        type: 'string',
        describe: 'Root directory',
        default: process.cwd(),
      })
      .option('config', {
        type: 'string',
        describe: 'Config file',
      })
      .option('outDir', {
        type: 'string',
        describe: 'Output directory',
        default: '.kubricate',
      }),
  handler: async (argv: ArgumentsCamelCase<GenerateCommandOptions>) => {
    await new GenerateCommand(argv, logger).execute();
  },
};
