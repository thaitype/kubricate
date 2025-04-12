import type { BaseConnector } from './BaseConnector.js';

/**
 * InMemoryConnector is a simple in-memory connector for secrets.
 * For testing purposes only.
 */
export class InMemoryConnector implements BaseConnector {
  private loaded: Set<string> = new Set();

  constructor(public config: Record<string, string>) {}

  async load(names: string[]) {
    for (const name of names) {
      if (!(name in this.config)) throw new Error(`Missing secret: ${name}`);
      this.loaded.add(name);
    }
  }

  get(name: string): string {
    if (!this.loaded.has(name)) throw new Error(`Secret ${name} not loaded`);
    return this.config[name];
  }
}
