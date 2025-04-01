import { cliEntryPoint } from './cli-interfaces/entrypoint.js';
import { version } from './version.js';

// Set up the CLI entry point
// This is the main entry point for the CLI application.
cliEntryPoint(process.argv, {
  version,
});
