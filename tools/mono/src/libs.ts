import { execa, ExecaError } from 'execa';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pc from "picocolors"

export type MonoScripts = Record<string, string | string[]>;

// Read "Pure ESM package": https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
const filename = fileURLToPath(import.meta.url); // ESM style like __filename in CommonJS
const dirname = path.dirname(filename); // ESM style like  __dirname in CommonJS

const rootFile = path.resolve(dirname, '..');
const nodeModules = path.resolve(rootFile, 'node_modules');
const binDir = path.resolve(nodeModules, '.bin');

export async function runScript(scripts: MonoScripts, options?: RunCommandOptions) {
  for (const command of processArgs(process.argv[2], scripts)) {
    console.log(`mono-scripts > ${command.join(' ')}`);
    await runCommand(command, options);
  }
}

export interface RunCommandOptions {
  /**
    * Whether to prefer local binaries over global ones
    * @default true
    */
  preferLocal?: boolean;
}

export async function runCommand(
  commands: string[],
  options?: RunCommandOptions
) {

  // Use `curl -o /dev/null https://proof.ovh.net/files/10Gb.dat` to test download speed
  const preferLocal = options?.preferLocal ?? true;
  const execaOptions = preferLocal ? { preferLocal: true, localDir: binDir } : {};
  const subprocess = execa({ env: { FORCE_COLOR: 'true' }, stdout: 'inherit', stderr: 'inherit', ...execaOptions })`${[...commands]}`;
  // subprocess.stdout.pipe(process.stdout);
  // subprocess.stderr.pipe(process.stderr);
  await subprocess.catch(error => {
    if (error instanceof ExecaError) {
      console.error(pc.red(`Command failed: ${error.command}`));
    }
    process.exit(1);
  });
}

export function processArgs(arg: string, commandMap: Record<string, string | string[]>) {
  if (!arg) {
    console.log(`Please provide a command`);
    process.exit(1);
  }

  if (!commandMap[arg]) {
    console.log(`Command ${arg} not found`);
    process.exit(1);
  }

  return typeof commandMap[arg] === 'string'
    ? [commandMap[arg].split(' ')]
    : commandMap[arg].map(command => command.split(' '));
}
