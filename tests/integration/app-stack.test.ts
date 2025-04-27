import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { rimraf } from 'rimraf';
import { executeKubricate } from '../helpers/execute-kubricate';
import fs from 'node:fs/promises';

const rootDir = path.resolve(__dirname, '..');
const fixturesDir = path.join(rootDir, 'fixtures', 'generate-output-stack');
const outputDir = path.join(fixturesDir, 'output');

describe('CLI Integration (generate)', () => {
  
  it('should generate expected files', async () => {
    const args = [
      'generate',
      '--root',
      fixturesDir,
    ];

    const { stdout, exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Generating stacks');

    const files = await fs.readdir(outputDir);

    for (const file of files) {
      const fullPath = path.join(outputDir, file);
      const content = await fs.readFile(fullPath, 'utf-8');

      // ✅ Snapshot EACH file individually
      expect(content).toMatchSnapshot(file);
    }
  });
});