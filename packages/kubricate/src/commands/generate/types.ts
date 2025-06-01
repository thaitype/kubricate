export interface ProjectGenerateOptions {
  /**
   * The directory where all generated manifest files will be written.
   * Relative to the project root.
   *
   * @default 'output'`
   */
  outputDir?: string;

  /**
   * Controls the structure of the generated output.
   *
   * - 'flat': All resources from all stacks in a single file (e.g. `stacks.yaml`)
   * - 'stack': One file per stack (e.g. `AppStack.yaml`, `CronStack.yaml`)
   * - 'resource': One folder per stack, each resource in its own file (e.g. `AppStack/Deployment_web.yaml`)
   *
   * @default 'stack'
   */
  outputMode?: 'flat' | 'stack' | 'resource';

  /**
   * If true, removes all previously generated files in the output directory before generating.
   *
   * Prevents stale or orphaned files when renaming stacks or switching output modes.
   *
   * @default true
   */
  cleanOutputDir?: boolean;
}
