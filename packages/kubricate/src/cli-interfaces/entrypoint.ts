import path from 'node:path';

import c from 'ansis';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import type { LogLevel } from '@kubricate/core';

import { MARK_INFO } from '../internal/constant.js';
import { ConsoleLogger } from '../internal/logger.js';
import { generateCommand } from './generate.js';
import { secretCommand } from './secret/index.js';

export interface CliEntryPointOptions {
  version: string;
  scriptName: string;
}

type YargsWithHelper = {
  showHelp: () => void;
};

const logError = (msg: string, yargs: YargsWithHelper) => {
  console.error(c.red(`\n✖ Error: ${msg}.\n`));
  console.info(c.cyan(`${MARK_INFO} Check the help for a list of available options.\n`));
  yargs.showHelp();
  console.log('\n');
};

const errorHelper = (msg: string | undefined, yargs: YargsWithHelper) => {
  if (msg?.includes('Unknown argument')) {
    const unknownArg = msg.match(/Unknown argument: (.+)/)?.[1];
    const errMsg = `Unknown option "${unknownArg}"`;
    logError(errMsg, yargs);
    return errMsg;
  }

  // Fallback to default error handling
  if (msg) {
    logError(msg, yargs);
    return msg;
  }

  return 'Unknown error occurred';
};

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
      .global(['root', 'config', 'verbose', 'silent', 'dry-run'])
      .middleware(argv => {
        let level: LogLevel = 'info';
        if (argv.silent) level = 'silent';
        else if (argv.verbose) level = 'debug';

        argv.logger = new ConsoleLogger(level);
        argv.version = options.version;
        argv.root = argv.root ? path.resolve(argv.root) : process.cwd();
      })
      .command(generateCommand)
      .command(secretCommand)
      .help()
      .alias('h', 'help')
      .alias('v', 'version')
      .demandCommand(1, 'Require <command>')
      .fail((msg, err, yargs) => {
        if (err) {
          errorHelper(msg, yargs);
          return reject(err);
        }

        return reject(new Error(errorHelper(msg, yargs)));
      })
      .strict()
      .parse();
  });
}
