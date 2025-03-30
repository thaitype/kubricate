import { readFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GlobalConfigOptions } from './types.js';
import type { BaseLogger } from '@kubricate/core';
import { getMatchConfigFile } from './load-config.js';
import type { GenerateCommandOptions } from './commands/generate.js';
import type { SecretsCommandOptions } from './commands/secrets.js';

export function getClassName(obj: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj && typeof obj === 'object' ? (obj as any).constructor.name : 'Unknown';
}

export function getPackageVersion(packageJsonPath: string) {
  let version = '0.0.0';
  try {
    // Read "Pure ESM package": https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
    const filename = fileURLToPath(import.meta.url); // ESM style like __filename in CommonJS
    const dirname = path.dirname(filename); // ESM style like  __dirname in CommonJS
    version = JSON.parse(readFileSync(join(dirname, packageJsonPath), 'utf-8')).version;
  } catch {
    console.warn('Could not read version from package.json');
  }
  return version;
}

export type AllCliConfigs = Partial<GenerateCommandOptions & SecretsCommandOptions & GlobalConfigOptions>;
export type Subcommand = 'generate' | 'secrets validate' | 'secrets apply';

export function verboseCliConfig(options: AllCliConfigs, logger: BaseLogger, subcommand?: Subcommand): void {
  logger.debug(`Verbose for global config: `);
  if (!options.config) {
    logger.debug(`No config file provided. Falling back to default: '${getMatchConfigFile()}'`);
  } else {
    logger.debug(`Using config file: ${options.config}`);
  }
  logger.debug(`Root directory: ${options.root}`);
  logger.debug(`Logger: ${getClassName(options.logger)}`);

  logger.debug(`Silent mode: ${options.silent}`);
  logger.debug(`Verbose mode: ${options.verbose}`);

  if (subcommand) {
    logger.debug(`--------------------------\n`);
    logger.debug(`Verbose for command specific config: `);
  }
  if (subcommand === 'generate') logger.debug(`[generate] Output directory: ${options.outDir}`);
}
