/**
 * Preset modes for resource allocation.
 * - `conservative`: Prioritizes stability and efficiency with lower `requests` and limited `limits`.
 * - `optimized`: A balanced approach that optimizes resource usage without overcommitting.
 * - `aggressive`: Maximizes performance by using all allocated resources with high limits.
 */
export type PresetType = 'conservative' | 'optimized' | 'aggressive';

/**
 * Input resource configuration.
 */
interface ResourceConfig {
  /**
   * Number of CPU cores (e.g., 0.6 for 600m).
   */
  cpu: number;
  /**
   * Memory size in GiB (e.g., 1.0 for 1024Mi).
   */
  memory: number;
}

/**
 * Computed Kubernetes resource requests and limits.
 */
interface ComputedResources {
  requests: { cpu: string; memory: string };
  limits: { cpu: string; memory: string };
}

/**
 * A class that calculates Kubernetes resource requests and limits based on predefined allocation strategies.
 *
 * @default preset, `conservative`
 */
export class ResourceAllocator {
  /**
   * Preset configurations defining scaling factors for requests and limits.
   */
  private static readonly PRESET_CONFIGS: Record<PresetType, { requestFactor: number; limitFactor: number }> = {
    /**
     * `conservative` mode:
     * - `requests` = 50% of input.
     * - `limits` = 100% of input.
     * - Best for workloads needing high stability and low resource contention.
     */
    conservative: { requestFactor: 0.5, limitFactor: 1.0 },

    /**
     * `optimized` mode:
     * - `requests` = 70% of input.
     * - `limits` = 130% of input.
     * - Recommended for general workloads that require a balance of efficiency and performance.
     */
    optimized: { requestFactor: 0.7, limitFactor: 1.3 },

    /**
     * `aggressive` mode:
     * - `requests` = 100% of input.
     * - `limits` = 200% of input.
     * - Best for high-performance workloads that need maximum resource usage.
     */
    aggressive: { requestFactor: 1.0, limitFactor: 2.0 },
  };

  /**
   * Initializes the ResourceAllocator with a preset allocation mode.
   * @param preset The resource allocation strategy (`conservative`, `optimized`, or `aggressive`).
   */
  constructor(private preset: PresetType = 'conservative') {}

  /**
   * Computes the resource requests and limits based on the selected preset.
   * @param input The input CPU (in cores) and memory (in GiB).
   * @returns An object containing `requests` and `limits` in Kubernetes format.
   */
  computeResources(input: ResourceConfig): ComputedResources {
    const { requestFactor, limitFactor } = ResourceAllocator.PRESET_CONFIGS[this.preset];

    return {
      requests: {
        cpu: this.formatCPU(input.cpu * requestFactor),
        memory: this.formatMemory(input.memory * requestFactor),
      },
      limits: {
        cpu: this.formatCPU(input.cpu * limitFactor),
        memory: this.formatMemory(input.memory * limitFactor),
      },
    };
  }

  /**
   * Converts CPU cores into Kubernetes milliCPU (m).
   * @param cpuCores Number of CPU cores.
   * @returns The formatted CPU string in milliCPU (e.g., "600m").
   */
  private formatCPU(cpuCores: number): string {
    return `${Math.round(cpuCores * 1000)}m`; // Convert cores to milliCPU (m)
  }

  /**
   * Converts memory from GiB to Kubernetes MiB.
   * @param memoryGiB Memory size in GiB.
   * @returns The formatted memory string in MiB (e.g., "1024Mi").
   */
  private formatMemory(memoryGiB: number): string {
    return `${Math.round(memoryGiB * 1024)}Mi`; // Convert GiB to MiB
  }
}
