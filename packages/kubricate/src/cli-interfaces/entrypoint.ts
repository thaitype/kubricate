import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { generateCommand } from './generate.js';
import { secretCommand } from './secret/index.js';
import { ConsoleLogger } from '../internal/logger.js';
import type { LogLevel } from '@kubricate/core';

export interface CliEntryPointOptions {
  version: string;
  scriptName: string;
}

export function cliEntryPoint(argv: string[], options: CliEntryPointOptions) {
  yargs(hideBin(argv))
    .scriptName(options.scriptName)
    .usage('$0 <command>')
    .version(options.version)
    // .epilog(c.red('Kubricate CLI - A CLI for managing Kubernetes stacks'))

    // Global options
    .option('root', {
      type: 'string',
      describe: 'Root directory',
    })
    .option('config', {
      type: 'string',
      describe: 'Config file path',
    })
    .option('verbose', {
      type: 'boolean',
      describe: 'Enable verbose output',
    })
    .option('silent', {
      type: 'boolean',
      describe: 'Suppress all output',
    })
    .option('dry-run', {
      type: 'boolean',
      describe: 'Do not execute any commands, just print what would be done',
    })
    .middleware(argv => {
      let level: LogLevel = 'info';
      if (argv.silent) level = 'silent';
      else if (argv.verbose) level = 'debug';

      argv.logger = new ConsoleLogger(level);
      argv.version = options.version;
    })

    // Register commands
    .command(generateCommand)
    .command(secretCommand)

    .help()
    .alias('h', 'help')
    .alias('v', 'version')
    .demandCommand(1, '') // do not show "command required" error
    .fail((msg, err, yargs) => {
      if (!msg && !err) {
        yargs.showHelp(); // when no command is given
      } else {
        console.error(msg);
        process.exit(99);
      }
    })
    .strict()
    .parse();
}
