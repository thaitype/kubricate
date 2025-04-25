import type { ProjectGenerateOptions } from "./types.js";


export function loadConfig(config: ProjectGenerateOptions): ProjectGenerateOptions {
  return {
    outputDir: config.outputDir ?? "dist",
    outputMode: config.outputMode ?? "stack",
    skipIfUnchanged: config.skipIfUnchanged ?? true,
    cleanOutputDir: config.cleanOutputDir ?? true,
  };
}