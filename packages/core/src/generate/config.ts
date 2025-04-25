import type { ProjectGenerateOptions } from "./types.js";
import { merge } from "lodash-es";

export const defaultConfig: ProjectGenerateOptions = {
  outputDir: "dist",
  outputMode: "stack",
  skipIfUnchanged: true,
  cleanOutputDir: true,
}

export class GenerateEngine {
  constructor(
    public readonly options: ProjectGenerateOptions,
  ) {
    this.options = merge({}, defaultConfig, options);
  }


}