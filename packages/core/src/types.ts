export type PrimitiveSecretValue = string | number | boolean | null | undefined;
/**
 * /**
 * SecretValue represents the expected format for secret values loaded by a BaseConnector
 * and consumed by a BaseProvider.
 *
 * A SecretValue can be either:
 * - A single primitive (e.g., token, password, string literal)
 * - A flat object of key-value pairs, where each value is a primitive
 *
 * All values must be serializable to string (e.g., for Kubernetes Secret encoding).
 * Nested objects, arrays, or non-serializable types are not supported.
 */
export type SecretValue = PrimitiveSecretValue | Record<string, PrimitiveSecretValue>;

export interface BaseSecretInjectionStrategy {
  /**
   * Override the default target path for the secret injection.
   *
   * Moreover, each provider has a default target path for the secret injection.
   * By using BaseProvider.getTargetPath()
   */
  targetPath?: string;
}

/**
 * Individual environment variable injection strategy.
 * Injects secrets as environment variables into container(s).
 *
 * @template Key - The type of keys available for this secret (e.g., 'username' | 'password')
 *
 * @example
 * ```typescript
 * const strategy: EnvInjectionStrategy = {
 *   kind: 'env',
 *   containerIndex: 0,
 *   key: 'username'
 * };
 * ```
 */
export interface EnvInjectionStrategy<Key extends string = string> extends BaseSecretInjectionStrategy {
  /** Injection strategy type: individual environment variable injection */
  kind: 'env';
  /** Zero-based index of the container to inject into (default: 0) */
  containerIndex?: number;
  /** Specific key from the secret to inject (e.g., 'username', 'password'). Required by some providers like BasicAuthSecretProvider */
  key?: Key;
}

/**
 * Volume mount injection strategy.
 * Mounts secrets as files in a volume at a specified path.
 *
 * @example
 * ```typescript
 * const strategy: VolumeInjectionStrategy = {
 *   kind: 'volume',
 *   mountPath: '/etc/secrets',
 *   containerIndex: 0
 * };
 * ```
 */
export interface VolumeInjectionStrategy extends BaseSecretInjectionStrategy {
  /** Injection strategy type: volume mount injection */
  kind: 'volume';
  /** Path where the secret volume should be mounted in the container (required) */
  mountPath: string;
  /** Zero-based index of the container to inject into (default: 0) */
  containerIndex?: number;
}

/**
 * Annotation injection strategy.
 * Injects secrets as pod/resource annotations.
 *
 * @example
 * ```typescript
 * const strategy: AnnotationInjectionStrategy = {
 *   kind: 'annotation'
 * };
 * ```
 */
export interface AnnotationInjectionStrategy extends BaseSecretInjectionStrategy {
  /** Injection strategy type: annotation injection */
  kind: 'annotation';
}

/**
 * Image pull secret injection strategy.
 * Injects Docker registry credentials for pulling private container images.
 *
 * @example
 * ```typescript
 * const strategy: ImagePullSecretInjectionStrategy = {
 *   kind: 'imagePullSecret'
 * };
 * ```
 */
export interface ImagePullSecretInjectionStrategy extends BaseSecretInjectionStrategy {
  /** Injection strategy type: image pull secret injection for private registry authentication */
  kind: 'imagePullSecret';
}

/**
 * Bulk environment variable injection strategy using envFrom.
 * Injects all keys from a secret as environment variables at once.
 *
 * @example
 * ```typescript
 * const strategy: EnvFromInjectionStrategy = {
 *   kind: 'envFrom',
 *   containerIndex: 0,
 *   prefix: 'DB_'
 * };
 * ```
 */
export interface EnvFromInjectionStrategy extends BaseSecretInjectionStrategy {
  /** Injection strategy type: bulk environment variable injection using envFrom */
  kind: 'envFrom';
  /** Zero-based index of the container to inject into (default: 0) */
  containerIndex?: number;
  /** Prefix to add to all environment variable names (e.g., 'DB_' results in 'DB_username', 'DB_password') */
  prefix?: string;
}

/**
 * Custom plugin-defined injection strategy.
 * Allows providers to implement custom injection mechanisms.
 *
 * @note This kind is not fully implemented yet. See https://github.com/thaitype/kubricate/issues/84
 *
 * @example
 * ```typescript
 * const strategy: PluginInjectionStrategy = {
 *   kind: 'plugin',
 *   action: 'custom-mount',
 *   args: ['/custom/path']
 * };
 * ```
 */
export interface PluginInjectionStrategy {
  /** Injection strategy type: custom plugin-defined injection */
  kind: 'plugin';
  /** Custom action identifier for the plugin */
  action?: string;
  /** Arguments to pass to the plugin */
  args?: unknown[];
  /** Additional plugin-specific fields */
  [key: string]: unknown;
}

/**
 * SecretInjectionStrategy defines how secrets should be injected into Kubernetes resources.
 *
 * This is a discriminated union type based on the `kind` field, where each variant represents
 * a different injection method supported by Kubernetes and Kubricate providers.
 *
 * @template Key - The type of keys available for env injection (e.g., 'username' | 'password')
 *
 * Available strategy kinds:
 * - `env` - Individual environment variable injection
 * - `envFrom` - Bulk environment variable injection
 * - `volume` - Volume mount injection
 * - `annotation` - Annotation injection
 * - `imagePullSecret` - Image pull secret for private registries
 * - `plugin` - Custom plugin-defined injection (experimental)
 */
export type SecretInjectionStrategy<Key extends string = string> =
  | EnvInjectionStrategy<Key>
  | VolumeInjectionStrategy
  | AnnotationInjectionStrategy
  | ImagePullSecretInjectionStrategy
  | EnvFromInjectionStrategy
  | PluginInjectionStrategy;
