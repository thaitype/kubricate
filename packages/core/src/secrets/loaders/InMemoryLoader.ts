import type { BaseLoader } from './BaseLoader.js';

// InMemoryLoader for isolated testing
export class InMemoryLoader implements BaseLoader {
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
