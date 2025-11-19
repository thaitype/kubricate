import type { ArgumentsCamelCase, CommandModule } from 'yargs';

import {
  GenerateMetadataCommand,
  type GenerateMetadataCommandOptions,
} from '../commands/GenerateMetadataCommand.js';
import { handlerError } from '../internal/error.js';
import { ConsoleLogger } from '../internal/logger.js';
import type { GlobalConfigOptions } from '../internal/types.js';

export const generateMetadataCommand: CommandModule<GlobalConfigOptions, GenerateMetadataCommandOptions> = {
  command: 'generate-metadata',
  describe: 'Generate metadata.gen.ts from package.json',
  builder: yargs =>
    yargs
      .option('cwd', {
        type: 'string',
        describe: 'Working directory (package root)',
        default: process.cwd(),
      })
      .option('outfile', {
        type: 'string',
        describe: 'Output file path (relative to cwd)',
        default: 'src/metadata.gen.ts',
      })
      .option('field', {
        type: 'string',
        describe: 'Field to extract from package.json',
        default: 'version',
      }),
  handler: async (argv: ArgumentsCamelCase<GenerateMetadataCommandOptions>) => {
    const logger = argv.logger ?? new ConsoleLogger('info');

    try {
      await new GenerateMetadataCommand(argv, logger).execute();
    } catch (error) {
      handlerError(error, logger);
    }
  },
};
