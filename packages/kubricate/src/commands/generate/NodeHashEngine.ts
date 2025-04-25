import { createHash } from 'crypto';
import { HashEngine } from '@kubricate/core';

export class NodeHashEngine extends HashEngine {
  protected computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
