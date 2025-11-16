import type { BaseLogger } from '@kubricate/core';

import type { BaseStack } from '../stack/BaseStack.js';
import type { ResourceEntry } from '../stack/ResourceComposer.js';
import type { KubricateConfig } from '../types.js';
import { getMatchConfigFile } from './load-config.js';

export function getClassName(obj: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj && typeof obj === 'object' ? (obj as any).constructor.name : 'Unknown';
}

/**
 * Utility functions for type validation.
 *
 * @param value - The value to check.
 * @param type - The expected type of the value.
 * @throws TypeError if the value is not of the expected type.
 */
export function validateString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`Expected a string, but received: ${typeof value}`);
  }
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

// export type AllCliConfigs = Partial<GenerateCommandOptions & SecretCommandOptions & GlobalConfigOptions>;
export type Subcommand = 'generate' | 'secret validate' | 'secret apply';

export function verboseCliConfig(options: Record<string, unknown>, logger: BaseLogger, subcommand?: Subcommand): void {
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

/**
 * Validate Stack Id or Resource Id
 * @param input * @returns {string} - The sanitized string.
 *
 * @ref https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set
 * The limit characters for labels is 63.
 */
export function validateId(input: string, subject = 'id'): void {
  const regex = /^[a-zA-Z0-9_-]+$/;

  if (!regex.test(input)) {
    throw new Error(
      `Invalid ${subject} "${input}". ` +
        `Only letters (a-z, A-Z), numbers (0-9), hyphens (-), and underscores (_) are allowed.`
    );
  }

  if (input.length > 63) {
    throw new Error(`Invalid ${subject} "${input}". Must not exceed 63 characters.`);
  }
}

/**
 * Validates stack template name format.
 *
 * Allowed patterns:
 * 1. <templateName>
 * 2. @<orgName>/<templateName>
 * 3. @<orgName>/<packageName>/<templateName>
 *
 * Character set: a-z, 0-9, ., _, -
 *
 * @param name - The stack template name to validate
 * @throws Error if the name doesn't match the allowed patterns
 *
 * @example
 * ```typescript
 * validateStackTemplateName('simple-app');  // OK
 * validateStackTemplateName('@acme/simple-app');  // OK
 * validateStackTemplateName('@acme/app-stacks/simple-app');  // OK
 * validateStackTemplateName('Simple App');  // ERROR: has space
 * validateStackTemplateName('SimpleApp');  // ERROR: has uppercase
 * ```
 */
export function validateStackTemplateName(name: string): void {
  // Pattern explanation:
  // ^                              - Start of string
  // (?:@[a-z0-9._-]+\/)?          - Optional: @ followed by org name and /
  // (?:[a-z0-9._-]+\/)?           - Optional: package name and /
  // [a-z0-9._-]+                  - Required: template name
  // $                              - End of string
  const pattern = /^(?:@[a-z0-9._-]+\/)?(?:[a-z0-9._-]+\/)?[a-z0-9._-]+$/;

  if (!pattern.test(name)) {
    throw new Error(
      `Invalid stack template name: "${name}"\n\n` +
        `Stack template names must match one of these patterns:\n` +
        `  1. <templateName>\n` +
        `  2. @<orgName>/<templateName>\n` +
        `  3. @<orgName>/<packageName>/<templateName>\n\n` +
        `Allowed characters: a-z, 0-9, . _ -\n` +
        `No spaces or uppercase letters allowed.\n\n` +
        `Examples:\n` +
        `  - simple-app\n` +
        `  - @acme/simple-app\n` +
        `  - @acme/app-stacks/simple-app`
    );
  }

  // Additional validation: maximum length (Kubernetes annotation limit is 253 for annotation values)
  if (name.length > 253) {
    throw new Error(
      `Stack template name too long: "${name}"\n` + `Maximum length is 253 characters (got ${name.length})`
    );
  }
}

/**
 * Censors secret values in a Kubernetes Secret payload for safe logging.
 * Replaces all values in the `data` and `stringData` fields with "***".
 *
 * @param payload - The Kubernetes Secret object to censor
 * @returns A new object with censored secret values
 */
export function censorSecretPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  // Create a deep copy to avoid mutating the original
  const censored = JSON.parse(JSON.stringify(payload));

  // Censor data field (base64-encoded secrets)
  if (censored.data && typeof censored.data === 'object') {
    for (const key of Object.keys(censored.data)) {
      censored.data[key] = '***';
    }
  }

  // Censor stringData field (plain-text secrets)
  if (censored.stringData && typeof censored.stringData === 'object') {
    for (const key of Object.keys(censored.stringData)) {
      censored.stringData[key] = '***';
    }
  }

  return censored;
}
