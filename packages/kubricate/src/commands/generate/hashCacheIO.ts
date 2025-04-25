import fs from 'node:fs';
import path from 'node:path';
import { GenerateHashCacheSchema } from '@kubricate/core';
import type { GenerateHashCache } from '@kubricate/core';

export function loadHashCache(path: string): GenerateHashCache {
  try {
    const raw = JSON.parse(fs.readFileSync(path, 'utf-8'));
    return GenerateHashCacheSchema.parse(raw);
  } catch {
    return {
      version: 1,
      outputMode: 'stack',
      generatedAt: new Date(0).toISOString(),
      files: {}
    };
  }
}

export function saveHashCache(_path: string, data: GenerateHashCache) {
  const dir = path.dirname(_path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(_path, JSON.stringify(data, null, 2));
}
