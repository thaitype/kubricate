import type { RenderedFile } from '../commands/generate/GenerateRunner.js';

/**
 * Result of filter operation containing filtered files and metadata
 */
export interface FilterResult {
  /**
   * Files that matched the filters
   */
  files: RenderedFile[];

  /**
   * Set of all stack IDs found in the input files
   */
  stackIds: Set<string>;

  /**
   * Set of all full resource IDs found in the input files (e.g., "app.deployment")
   */
  resourceIds: Set<string>;

  /**
   * Filters that matched at least one file
   */
  matchedFilters: Set<string>;
}

/**
 * ResourceFilter handles filtering of rendered Kubernetes resources
 * by stack ID or full resource ID (stackId.resourceId).
 *
 * This is a pure class with no side effects - it doesn't log, doesn't
 * mutate input, and has no dependencies. Perfect for unit testing.
 */
export class ResourceFilter {
  /**
   * Filters rendered files by stack ID or resource ID.
   *
   * This is a pure function that:
   * - Takes files and filters
   * - Returns filtered files or throws descriptive error
   * - Has zero side effects (no logging, no mutation)
   * - Provides detailed error messages for unmatched filters
   *
   * @param files - The rendered files to filter
   * @param filters - Array of stack IDs or resource IDs (e.g., ["app", "db.statefulset"])
   * @returns Filtered files that match the filters
   * @throws Error if any filter doesn't match any file
   *
   * @example
   * ```typescript
   * const filter = new ResourceFilter();
   * const files = [
   *   { originalPath: 'app.deployment', filePath: '/app.yaml', content: '...' },
   *   { originalPath: 'db.statefulset', filePath: '/db.yaml', content: '...' }
   * ];
   *
   * // Filter by stack ID
   * const result = filter.filter(files, ['app']);
   * // Returns only app.deployment
   *
   * // Filter by full resource ID
   * const result2 = filter.filter(files, ['db.statefulset']);
   * // Returns only db.statefulset
   *
   * // Invalid filter throws error
   * filter.filter(files, ['nonexistent']);
   * // Throws: "The following filters did not match any resource: nonexistent"
   * ```
   */
  filter(files: RenderedFile[], filters: string[]): RenderedFile[] {
    // Early return for empty filters
    if (filters.length === 0) {
      return files;
    }

    const filterSet = new Set(filters);
    const matchedFilters = new Set<string>();
    const stackIds = new Set<string>();
    const fullResourceIds = new Set<string>();

    // Filter files and collect metadata
    const filtered = files.filter(file => {
      const originalPath = file.originalPath; // e.g., myApp.deployment
      const [stackId] = originalPath.split('.');

      // Track all stack and resource IDs for error reporting
      stackIds.add(stackId);
      fullResourceIds.add(originalPath);

      // Check if this file matches any filter (by stack ID or full resource ID)
      const matched = filterSet.has(stackId) || filterSet.has(originalPath);

      // Track which filters were matched
      if (matched) {
        if (filterSet.has(stackId)) matchedFilters.add(stackId);
        if (filterSet.has(originalPath)) matchedFilters.add(originalPath);
      }

      return matched;
    });

    // Find filters that didn't match anything
    const unmatchedFilters = filters.filter(f => !matchedFilters.has(f));

    // Throw detailed error if any filters didn't match
    if (unmatchedFilters.length > 0) {
      throw this.createFilterError(unmatchedFilters, stackIds, fullResourceIds);
    }

    return filtered;
  }

  /**
   * Creates a detailed error message for unmatched filters.
   *
   * Pure helper function that builds a user-friendly error message
   * showing what filters didn't match and what valid options are available.
   *
   * @param unmatchedFilters - Filters that didn't match any files
   * @param stackIds - All available stack IDs
   * @param resourceIds - All available resource IDs
   * @returns Error with detailed message
   */
  private createFilterError(unmatchedFilters: string[], stackIds: Set<string>, resourceIds: Set<string>): Error {
    const stacksList = Array.from(stackIds).sort().join('\n     - ');
    const resourcesList = Array.from(resourceIds).sort().join('\n     - ');

    const stacksSection = stackIds.size > 0 ? `  • Stacks: \n` + `     - ${stacksList}\n` : '';
    const resourcesSection = resourceIds.size > 0 ? `  • Resources: \n` + `     - ${resourcesList}\n` : '';

    return new Error(
      `The following filters did not match any resource: ${unmatchedFilters.join(', ')}.\n\n` +
        `Available filters:\n` +
        stacksSection +
        resourcesSection +
        `\nPlease check your --filter values and try again.`
    );
  }

  /**
   * Gets detailed information about filtering operation.
   *
   * Useful for testing or debugging to see what was matched/unmatched.
   *
   * @param files - The rendered files to analyze
   * @param filters - Array of filters to check
   * @returns Detailed filter result with metadata
   */
  getFilterInfo(files: RenderedFile[], filters: string[]): FilterResult {
    if (filters.length === 0) {
      return {
        files,
        stackIds: new Set(),
        resourceIds: new Set(),
        matchedFilters: new Set(),
      };
    }

    const filterSet = new Set(filters);
    const matchedFilters = new Set<string>();
    const stackIds = new Set<string>();
    const resourceIds = new Set<string>();

    const filtered = files.filter(file => {
      const originalPath = file.originalPath;
      const [stackId] = originalPath.split('.');

      stackIds.add(stackId);
      resourceIds.add(originalPath);

      const matched = filterSet.has(stackId) || filterSet.has(originalPath);

      if (matched) {
        if (filterSet.has(stackId)) matchedFilters.add(stackId);
        if (filterSet.has(originalPath)) matchedFilters.add(originalPath);
      }

      return matched;
    });

    return {
      files: filtered,
      stackIds,
      resourceIds,
      matchedFilters,
    };
  }
}
