import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalConfigOptions } from '../internal/types.js';
import { ConsoleLogger } from '../internal/logger.js';
import { handlerError } from '../internal/error.js';
import { verboseCliConfig } from '../internal/utils.js';
import { GenerateCommand, type GenerateCommandOptions } from '../commands/generate/index.js';
import { ConfigLoader } from '../commands/ConfigLoader.js';
import type { BaseLogger } from '@kubricate/core';

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
    let logger: BaseLogger | undefined = new ConsoleLogger('silent');

    try {
      verboseCliConfig(argv, logger, 'generate');
      const configLoader = new ConfigLoader(argv, logger);

      const config = await configLoader.load();

      // Set to normal log level
      logger = argv.logger ?? new ConsoleLogger();
      if (config.generate?.outputMode === 'stdout' || argv.stdout) {
        argv.stdout = true;
        logger = new ConsoleLogger('silent');
      }
      if (argv.stdout === false && argv.filter) {
        throw new Error('"--filter" option is allowed only when using with "--stdout" option');
      }

      configLoader.setLogger(logger);
      configLoader.showVersion();
      await configLoader.prepare(config);

      await new GenerateCommand(argv, logger).execute(config);
    } catch (error) {
      handlerError(error, logger);
    }
  },
};
