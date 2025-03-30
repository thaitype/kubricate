import { BaseStack } from '@kubricate/core';

export interface KubricateConfig {
  stacks?: Record<string, BaseStack>;
}

export function defineConfig(config: KubricateConfig): KubricateConfig {
  return config;
}
