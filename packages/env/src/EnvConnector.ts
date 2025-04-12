import { type BaseConnector, type BaseLogger, type SecretValue } from '@kubricate/core';
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { maskingValue } from './utilts.js';

export interface EnvConnectorConfig {
  /**
   * The prefix to use for environment variables.
   * @default `KUBRICATE_SECRET_`
   */
  prefix?: string;

  /**
   * populate process.env with the contents of a .env file
   * @default `true`
   */
  allowDotEnv?: boolean;

  /**
   * Whether to perform case-insensitive lookups for environment variables.
   * If true, the connector will match environment variable names in a case-insensitive manner.
   * @default `false`
   */
  caseInsensitive?: boolean;

  /**
   * The working directory to load the .env file from.
   * This is useful for loading .env files from different directories.
   * 
   * @default `process.cwd()`
   */
  workingDir?: string;
}

/**
 * EnvConnector is a BaseConnector implementation that reads secrets
 * from process.env, optionally loading from a .env file and supporting
 * configurable prefixes and case-insensitive lookups.
 */
export class EnvConnector implements BaseConnector<EnvConnectorConfig> {
  public config: EnvConnectorConfig;
  private prefix: string;
  private secrets = new Map<string, SecretValue>();
  private caseInsensitive: boolean;
  public logger?: BaseLogger;
  private workingDir?: string;

  constructor(config?: EnvConnectorConfig) {
    this.config = config ?? {};
    this.prefix = config?.prefix ?? 'KUBRICATE_SECRET_';
    this.caseInsensitive = config?.caseInsensitive ?? false;
    this.workingDir = config?.workingDir;
  }
  /**
   * Set the working directory for loading .env files.
   * @param path The path to the working directory.
   */
  setWorkingDir(path: string): void {
    this.workingDir = path;
  }

  /**
   * Get the working directory for loading .env files.
   * @returns The path to the working directory.
   */
  getWorkingDir(): string | undefined {
    return this.workingDir;
  }

  getEnvFilePath(): string {
    return path.join(this.workingDir ?? process.cwd(), '.env');
  }

  normalizeName(name: string): string {
    return this.caseInsensitive ? name.toLowerCase() : name;
  }
  /**
   * Load secrets from environment variables.
   * @param names The names of the secrets to load.
   * @throws Will throw an error if a secret is not found or if the name is invalid.
   */
  async load(names: string[]): Promise<void> {
    if (this.config.allowDotEnv ?? true) {
      loadDotenv({ path: this.getEnvFilePath() });
      this.logger?.debug(`Loaded .env file from\n   ${this.getEnvFilePath()}`);
    }

    for (const name of names) {
      this.logger?.debug(`Loading secret: ${name}`);
      const expectedKey = this.prefix + name;

      const matchKey = this.caseInsensitive
        ? Object.keys(process.env).find(k => this.normalizeName(k) === this.normalizeName(expectedKey))
        : expectedKey;

      if (!matchKey || !process.env[matchKey]) {
        throw new Error(`Missing environment variable: ${expectedKey}`);
      }

      const storeKey = this.normalizeName(name);
      this.secrets.set(storeKey, this.tryParseSecretValue(process.env[matchKey]));
      this.logger?.debug(`Loaded secret: ${name} -> ${storeKey}`);
      this.logger?.debug(`Value: ${maskingValue(process.env[matchKey]!)} `);
    }
  }

  tryParseSecretValue(value: string): SecretValue {
    try {
      const parsed = JSON.parse(value);

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed) &&
        Object.values(parsed).every(
          v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null
        )
      ) {
        return parsed; // ✅ Valid flat object
      }

      return value; // fallback: keep original string
    } catch {
      return value; // Not JSON, use raw string
    }
  }

  /**
   * Get the value of a secret.
   * @param name The name of the secret to get.
   * @returns The value of the secret.
   * @throws Will throw an error if the secret is not loaded.
   */
  get(name: string): SecretValue {
    const key = this.caseInsensitive ? name.toLowerCase() : name;
    if (!this.secrets.has(key)) {
      throw new Error(`Secret '${name}' not loaded. Did you call load()?`);
    }
    return this.secrets.get(key)!;
  }
}
