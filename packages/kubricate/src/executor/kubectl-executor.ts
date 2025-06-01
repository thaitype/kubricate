import crypto from 'node:crypto';
// kubectl-executor.ts
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { BaseLogger } from '@kubricate/core';

import type { ExecaExecutor } from './execa-executor.js';

export class KubectlExecutor {
  constructor(
    private readonly kubectlPath: string,
    private readonly logger: BaseLogger,
    private readonly execa: ExecaExecutor
  ) {}

  async apply(resource: object) {
    const tempPath = this.createTempFilePath();
    await writeFile(tempPath, JSON.stringify(resource), 'utf8');

    this.logger.info(`Applying secret resource with kubectl: ${tempPath}`);
    try {
      await this.execa.run(this.kubectlPath, ['apply', '-f', tempPath]);
      this.logger.log('✅ Applied secret via kubectl');
    } catch (err) {
      this.logger.error(`❌ kubectl apply failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private createTempFilePath(): string {
    const id = crypto.randomUUID();
    return path.join(tmpdir(), `kubricate-secret-${id}.json`);
  }
}
