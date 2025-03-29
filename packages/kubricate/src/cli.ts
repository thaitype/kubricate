import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { applyCommand } from './commands/apply.js';
import ansis from 'ansis';

yargs(hideBin(process.argv))
  .scriptName(ansis.blue(ansis.bold('kubricate')))
  .usage('$0 <command>')
  .version('1.0.0')
  .epilog(ansis.red('Kubricate CLI - A CLI for managing Kubernetes stacks'))
  .command(applyCommand)
  .help()
  .alias('h', 'help')
  .alias('v', 'version')
  .demandCommand(1, '') // do not show "command required" error
  .fail((msg, err, yargs) => {
    if (!msg && !err) {
      yargs.showHelp(); // when no command is given
    } else {
      console.error(msg);
      process.exit(1);
    }
  })
  .strict()
  .parse();