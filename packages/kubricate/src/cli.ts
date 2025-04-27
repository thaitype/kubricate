import { cliEntryPoint } from './cli-interfaces/entrypoint.js';
import { handlerError } from './internal/error.js';
import { ConsoleLogger } from './internal/logger.js';
import { version } from './version.js';

// Set up the CLI entry point
// This is the main entry point for the CLI application.
cliEntryPoint(process.argv, {
  version,
  scriptName: 'kbr',
})
.catch(err => {
  handlerError(err, new ConsoleLogger('silent'), 99);
});