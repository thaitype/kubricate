import { dirname, join, resolve } from 'node:path';

import c from 'ansis';

import type { BaseLogger } from '@kubricate/core';

import type { IFileSystem } from '../domain/IFileSystem.js';
import { NodeFileSystem } from '../domain/NodeFileSystem.js';
import type { GlobalConfigOptions } from '../internal/types.js';

export interface GenerateMetadataCommandOptions extends GlobalConfigOptions {
  cwd?: string;
  outfile?: string;
  field?: string;
}

/**
 * Command to generate metadata.gen.ts from package.json
 *
 * This command:
 * 1. Reads package.json from the specified directory
 * 2. Extracts the version field (or other specified field)
 * 3. Generates or updates metadata.gen.ts
 *
 * Example usage:
 *   kubricate generate-metadata
 *   kubricate generate-metadata --cwd packages/core
 *   kubricate generate-metadata --outfile src/metadata.gen.ts
 */
export class GenerateMetadataCommand {
  private readonly cwd: string;
  private readonly outfile: string;
  private readonly field: string;
  private readonly fileSystem: IFileSystem;

  constructor(
    private readonly options: GenerateMetadataCommandOptions,
    private readonly logger: BaseLogger,
    fileSystem?: IFileSystem
  ) {
    this.cwd = resolve(options.cwd || process.cwd());
    this.outfile = options.outfile || 'src/metadata.gen.ts';
    this.field = options.field || 'version';
    this.fileSystem = fileSystem ?? new NodeFileSystem();
  }

  async execute(): Promise<void> {
    try {
      this.logger.info(c.bold(`\n${c.blue('kubricate')} generate-metadata\n`));

      // Read package.json
      const packageJsonPath = join(this.cwd, 'package.json');
      this.logger.debug(`Reading package.json from: ${packageJsonPath}`);

      let packageJson: Record<string, unknown>;
      try {
        const content = this.fileSystem.readFile(packageJsonPath);
        packageJson = JSON.parse(content);
      } catch (error) {
        throw new Error(
          `Failed to read package.json at ${packageJsonPath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Extract field value
      const fieldValue = packageJson[this.field];
      if (!fieldValue || typeof fieldValue !== 'string') {
        throw new Error(
          `Field "${this.field}" not found or is not a string in package.json. Got: ${typeof fieldValue}`
        );
      }

      this.logger.info(`${c.cyan('ℹ')} Found ${this.field}: ${c.green(fieldValue)}`);

      // Generate metadata.gen.ts content
      const content = this.generateMetadataContent(fieldValue);

      // Write to file
      const outfilePath = join(this.cwd, this.outfile);
      this.logger.debug(`Writing metadata file to: ${outfilePath}`);

      try {
        // Ensure directory exists
        const outfileDir = dirname(outfilePath);
        if (!this.fileSystem.exists(outfileDir)) {
          this.fileSystem.mkdir(outfileDir, { recursive: true });
        }

        this.fileSystem.writeFile(outfilePath, content);
      } catch (error) {
        throw new Error(`Failed to write ${outfilePath}: ${error instanceof Error ? error.message : String(error)}`);
      }

      this.logger.info(`${c.green('✔')} Generated ${c.cyan(this.outfile)}`);
      this.logger.info(c.green(`${c.green('✔')} Done!\n`));
    } catch (error) {
      this.logger.error(c.red(`✖ Error: ${error instanceof Error ? error.message : String(error)}`));
      throw error;
    }
  }

  private generateMetadataContent(version: string): string {
    return `/**
 * Auto-generated metadata file.
 * DO NOT EDIT MANUALLY.
 *
 * Generated from package.json by kubricate CLI.
 * Run \`kubricate generate-metadata\` to update this file.
 */
export const metadata = {
  version: '${version}',
};
`;
  }
}
