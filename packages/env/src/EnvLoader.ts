import type { BaseLoader } from '@kubricate/core';

export interface EnvLoaderConfig {
  /**
   * The name of the secret to use.
   */
  name: string;
}

export class EnvLoader implements BaseLoader<EnvLoaderConfig> {
  constructor(public config: EnvLoaderConfig) {}
}
