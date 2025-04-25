import fs from 'node:fs';
import path from 'node:path';
import { GenerateEngine, type ProjectGenerateOptions } from '@kubricate/core';

import { loadHashCache, saveHashCache } from './hashCacheIO.js';
import { NodeHashEngine } from './NodeHashEngine.js';

export class GenerateRunner {
  constructor(
    private readonly config: Required<ProjectGenerateOptions>,
    private readonly renderedFiles: { filePath: string; content: string }[]
  ) { }

  async run() {
    const hashPath = '.kubricate/generate.hash.json';
    const previousCache = loadHashCache(hashPath);

    // Wipe stale output if outputMode changed
    if (previousCache.outputMode !== this.config.outputMode) {
      console.log(`[generate] Output mode changed (${previousCache.outputMode} → ${this.config.outputMode}), cleaning output dir...`);
      this.cleanOutputDir(this.config.outputDir);
      previousCache.files = {};
    }

    const hashEngine = new NodeHashEngine(previousCache.files);
    const engine = new GenerateEngine(this.config, hashEngine);

    const written: string[] = [];

    for (const { filePath, content } of this.renderedFiles) {
      const { shouldWrite } = engine.planWrite(filePath, content);
      if (shouldWrite) {
        this.ensureDir(filePath);
        fs.writeFileSync(filePath, content);
        written.push(filePath);
      } else {
        console.log(`✓ Skipped: ${filePath}`);
      }
    }

    // Remove stale files if cleaning
    if (engine.config.cleanOutputDir) {
      const stale = engine.getStaleFiles();
      for (const stalePath of stale) {
        fs.rmSync(path.join(this.config.outputDir, stalePath), { force: true });
        console.log(`✗ Removed stale: ${stalePath}`);
      }
    }

    // Persist hash state
    saveHashCache(hashPath, {
      version: 1,
      outputMode: engine.config.outputMode,
      generatedAt: new Date().toISOString(),
      files: engine.getUpdatedHashes(),
    });

    console.log(`✅ Wrote ${written.length} file(s) to "${this.config.outputDir}/"`);
  }

  private cleanOutputDir(dir: string) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  private ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
  }
}
