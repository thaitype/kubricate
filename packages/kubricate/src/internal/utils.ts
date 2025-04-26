import type { GlobalConfigOptions } from './types.js';
import type { BaseLogger, BaseStack, KubricateConfig, ResourceEntry } from '@kubricate/core';
import { getMatchConfigFile } from './load-config.js';
import type { SecretCommandOptions } from '../commands/secret.js';
import type { GenerateCommandOptions } from '../commands/generate/index.js';

export function getClassName(obj: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj && typeof obj === 'object' ? (obj as any).constructor.name : 'Unknown';
}

export function getStackName(stack: BaseStack): string {
  const stackName = stack.getName();
  if (stackName) {
    return stackName;
  }
  return getClassName(stack);
}

export interface StackInfo {
  name: string;
  type: string;
  kinds: {
    id: string;
    kind: string;
  }[];
}

export function extractKindFromResourceEntry(entry: ResourceEntry): string {
  if (entry.entryType === 'class') {
    return String(entry.type?.name);
  }
  if (entry.config.kind) {
    return entry.config.kind as string;
  }
  return 'Unknown';
}

export function extractStackInfo(name: string, stack: BaseStack): StackInfo {
  const composer = stack.getComposer();
  if (!composer) {
    throw new Error(`Stack ${name} does not have a composer.`);
  }
  return {
    name,
    type: getStackName(stack),
    kinds: Object.entries(composer._entries).map(([id, entry]) => {
      return {
        id,
        kind: extractKindFromResourceEntry(entry),
      };
    }),
  };
}

export function extractStackInfoFromConfig(config: KubricateConfig): StackInfo[] {
  const stacks = Object.entries(config.stacks || {}).map(([name, stack]) => extractStackInfo(name, stack));
  return stacks;
}

export type AllCliConfigs = Partial<GenerateCommandOptions & SecretCommandOptions & GlobalConfigOptions>;
export type Subcommand = 'generate' | 'secret validate' | 'secret apply';

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
