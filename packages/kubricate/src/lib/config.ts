import { KubricateStack } from "@kubricate/core";

export interface KubricateConfig {
  stacks: Record<string, KubricateStack>;
}

export function defineConfig(config: KubricateConfig): KubricateConfig {
  return config;
}