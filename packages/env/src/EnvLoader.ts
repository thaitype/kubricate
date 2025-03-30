import type { BaseLoader } from '@kubricate/core';
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';

export interface EnvLoaderConfig {
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
   * If true, the loader will match environment variable names in a case-insensitive manner.
   * @default `false`
   */
  caseInsensitive?: boolean;
}

/**
 * EnvLoader is a BaseLoader implementation that reads secrets
 * from process.env, optionally loading from a .env file and supporting
 * configurable prefixes and case-insensitive lookups.
 */
export class EnvLoader implements BaseLoader<EnvLoaderConfig> {
  public config: EnvLoaderConfig;
  private prefix: string;
  private secrets = new Map<string, string>();
  private caseInsensitive: boolean;
  private workingDir = process.cwd(); // Default working directory

  constructor(config?: EnvLoaderConfig) {
    this.config = config ?? {};
    this.prefix = config?.prefix ?? 'KUBRICATE_SECRET_';
    this.caseInsensitive = config?.caseInsensitive ?? false;
  }

  /**
   * Set the working directory for loading .env files.
   * @param path The path to the working directory.
   */
  setWorkingDir(path: string): void {
    this.workingDir = path;
  }

  getEnvFilePath(): string {
    return path.join(this.workingDir, '.env');
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
    if (this.config?.allowDotEnv ?? true) {
      loadDotenv({
        path: this.getEnvFilePath(),
      });
      console.log(`Loaded .env file from\n   ${this.getEnvFilePath()}`);
    }

    for (const name of names) {
      if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        throw new Error(`Invalid env var name: ${name}`);
      }

      const expectedKey = this.prefix + name;
      let actualKey = expectedKey;

      if (this.caseInsensitive) {
        const match = Object.keys(process.env).find(
          envKey => this.normalizeName(envKey) === this.normalizeName(expectedKey)
        );
        if (!match) {
          throw new Error(`Missing environment variable: ${expectedKey}`);
        }
        actualKey = match;
      }

      const value = process.env[actualKey];

      if (!value) {
        throw new Error(`Missing environment variable: ${actualKey}`);
      }

      const storeKey = this.normalizeName(name);
      this.secrets.set(storeKey, value);
    }
  }

  /**
   * Get the value of a secret.
   * @param name The name of the secret to get.
   * @returns The value of the secret.
   * @throws Will throw an error if the secret is not loaded.
   */
  get(name: string): string {
    const key = this.caseInsensitive ? name.toLowerCase() : name;
    if (!this.secrets.has(key)) {
      throw new Error(`Secret '${name}' not loaded. Did you call load()?`);
    }
    return this.secrets.get(key)!;
  }
}
