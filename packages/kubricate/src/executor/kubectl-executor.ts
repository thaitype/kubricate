// kubectl-executor.ts
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import crypto from 'node:crypto';
import type { ExecaExecutor } from './execa-executor.js';
import type { ILogger } from '../logger.js';

export class KubectlExecutor {
  constructor(
    private readonly kubectlPath: string,
    private readonly logger: ILogger,
    private readonly execa: ExecaExecutor
  ) {}

  async applyManifest(manifest: object) {
    const tempPath = this.createTempFilePath();
    await writeFile(tempPath, JSON.stringify(manifest), 'utf8');

    this.logger.info(`Applying secret manifest with kubectl: ${tempPath}`);
    try {
      await this.execa.run(this.kubectlPath, ['apply', '-f', tempPath]);
      this.logger.success('✅ Applied secret via kubectl');
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
