import { cac } from 'cac';
import c from 'ansis';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GenerateCommand, GenerateCommandOptions } from './commands/generate.js';

const pkg = {
  version: '0.0.0',
};
try {
  pkg.version = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8')).version;
} catch {
  console.warn('Could not read version from package.json');
}

const cli = cac(c.bold(c.blue('kubricate')));

cli
  .command('generate', 'Generate a stack into yaml files')
  .option('--root <root>', 'Root directory', { default: process.cwd() })
  .option('--config <config>', 'Config file')
  .option('--outDir <dir>', 'Output directory', { default: '.kubricate' })
  // Action
  .action(async (options: GenerateCommandOptions) => {
    await new GenerateCommand(options).execute();
  });

cli.version(pkg.version);
cli.help();
cli.parse();
