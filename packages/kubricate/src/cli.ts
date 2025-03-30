import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { generateCommand } from './cli-interfaces/generate.js';
import { secretsCommand } from './cli-interfaces/secrets/index.js';
import { ConsoleLogger, type LogLevel } from './logger.js';
import { getPackageVersion } from './utils.js';

yargs(hideBin(process.argv))
  .scriptName('kubricate')
  .usage('$0 <command>')
  .version(getPackageVersion('../../package.json'))
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
  .middleware(argv => {
    let level: LogLevel = 'info';
    if (argv.silent) level = 'silent';
    else if (argv.verbose) level = 'debug';

    argv.logger = new ConsoleLogger(level);
  })

  // Register commands
  .command(generateCommand)
  .command(secretsCommand)

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
