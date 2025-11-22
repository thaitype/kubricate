#!/usr/bin/env node
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

import { generateMetadataCommand } from './cli-interfaces/generate-metadata.js';

/**
 * kubricate-local CLI entrypoint
 *
 * This is a minimal CLI tool that replicates commands from the main kubricate package
 * to avoid circular dependencies within the monorepo.
 *
 * Currently supports:
 * - generate-metadata: Generate metadata.gen.ts from package.json
 */
async function main() {
  await yargs(hideBin(process.argv))
    .scriptName('kubricate-local')
    .usage('$0 <command> [options]')
    .command(generateMetadataCommand)
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .alias('version', 'v')
    .strict()
    .parse();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
