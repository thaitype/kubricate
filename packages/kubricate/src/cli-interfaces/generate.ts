import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalConfigOptions } from '../internal/types.js';
import { ConsoleLogger } from '../internal/logger.js';
import { handlerError } from '../internal/error.js';
import { GenerateCommand, type GenerateCommandOptions } from '../commands/generate/index.js';
import { ConfigLoader } from '../commands/ConfigLoader.js';

export const generateCommand: CommandModule<GlobalConfigOptions, GenerateCommandOptions> = {
  command: 'generate',
  describe: 'Generate a stack into yaml files',
  builder: yargs =>
    yargs
      .option('outDir', {
        type: 'string',
        describe: 'Output directory',
        default: 'output',
      })
      .option('stdout', {
        type: 'boolean',
        describe: 'Output to stdout',
        default: false,
      })
      .option('filter', {
        type: 'string',
        describe: 'Filter stacks or resources by ID (e.g., myStack or myStack.resource)',
        array: true,
      }),
  handler: async (argv: ArgumentsCamelCase<GenerateCommandOptions>) => {
    const logger = argv.stdout ? new ConsoleLogger('silent') : (argv.logger ?? new ConsoleLogger('info'));

    try {
      if (argv.stdout === false && argv.filter) {
        throw new Error('"--filter" option is allowed only when using with "--stdout" option');
      }
      const configLoader = new ConfigLoader(argv, logger);
      const { config } = await configLoader.initialize({
        commandOptions: argv,
        subject: 'generate'
      });

      await new GenerateCommand(argv, logger).execute(config);
    } catch (error) {
      handlerError(error, logger);
    }
  },
};
