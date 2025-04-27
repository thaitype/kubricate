import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { generateCommand } from './generate.js';
import { secretCommand } from './secret/index.js';
import { ConsoleLogger } from '../internal/logger.js';
import type { LogLevel } from '@kubricate/core';
import c from 'ansis'
import { MARK_INFO } from '../internal/constant.js';

export interface CliEntryPointOptions {
  version: string;
  scriptName: string;
}

type YargsWithHelper = {
  showHelp: () => void;
}

const errorHelper = (msg: string | undefined, yargs: YargsWithHelper) => {

  if (msg?.includes('Unknown argument')) {
    const unknownArg = msg.match(/Unknown argument: (.+)/)?.[1];
    console.error(c.red(`\n✖ Error: Unknown option "${unknownArg}".\n`));
    console.info(c.cyan(`${MARK_INFO} Check the help for a list of available options.\n`));
    yargs.showHelp();
    console.log('\n');
    return `Unknown option "${unknownArg}"`;
  }

  // Fallback to default error handling
  if (msg) {
    console.error(msg);
  } else {
    console.error('Unknown error occurred');
  }
  console.log('\n');
}

export function cliEntryPoint(argv: string[], options: CliEntryPointOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    yargs(hideBin(argv))
      .scriptName(options.scriptName)
      .usage('$0 <command>')
      .version(options.version)
      .option('root', { type: 'string', describe: 'Root directory' })
      .option('config', { type: 'string', describe: 'Config file path' })
      .option('verbose', { type: 'boolean', describe: 'Enable verbose output' })
      .option('silent', { type: 'boolean', describe: 'Suppress all output' })
      .option('dry-run', { type: 'boolean', describe: 'Dry run mode (Not Stable Yet)' })
      .middleware(argv => {
        let level: LogLevel = 'info';
        if (argv.silent) level = 'silent';
        else if (argv.verbose) level = 'debug';

        argv.logger = new ConsoleLogger(level);
        argv.version = options.version;
      })
      .command(generateCommand)
      .command(secretCommand)
      .help()
      .alias('h', 'help')
      .alias('v', 'version')
      .demandCommand(1, '')
      .fail((msg, err, yargs) => {

        if (!msg && !err) {
          errorHelper(msg, yargs);
          return resolve();
        }

        if (msg) {
          return reject(new Error(errorHelper(msg, yargs)));
        }

        if (err) {
          errorHelper(msg, yargs);
          return reject(err);
        }
      })
      .strict()
      .parse();
  });
}