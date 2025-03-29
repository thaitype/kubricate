import cac from 'cac';
import c from 'ansis';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = {
  version: '0.0.0',
}
try {
  pkg.version = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8')).version;
} catch {
  console.warn('Could not read version from package.json');
}

const cli = cac(c.bold(c.blue('kubricate')));

cli
  .command('apply', 'Apply a stack')
  .option('--root <root>', 'Root directory', { default: process.cwd() })
  .option('--config <config>', 'Config file')
  .option('--outDir <dir>', 'Output directory', { default: '.kubricate' })
  // Action
  .action(async (options: {
    root: string;
    config?: string;
    outDir: string;
  }) => {
    const { root, config, outDir } = options;

    console.log(c.bold('Kubricate CLI'));
    console.log(c.dim('A CLI for managing Kubernetes stacks'));
    console.log(c.dim('Version: 1.0.0'));
    console.log(c.dim('Kubricate CLI - A CLI for managing Kubernetes stacks'));

    if (!config) {
      console.log('no config file provided');
      console.log('using default config file');
    } else {
      console.log(`Using config file: ${config}`);
    }
    console.log(`Root directory: ${root}`);
    console.log(`Output directory: ${outDir}`);
  })

cli.version(pkg.version);
cli.help();
cli.parse();