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
 * SecretInjectionStrategy defines how secrets should be injected into Kubernetes resources.
 *
 * This is a discriminated union type based on the `kind` field, where each variant represents
 * a different injection method supported by Kubernetes and Kubricate providers.
 */
export type SecretInjectionStrategy<Key extends string = string> =
  | ({
      /** Injection strategy type: individual environment variable injection */
      kind: 'env';
      /** Zero-based index of the container to inject into (default: 0) */
      containerIndex?: number;
      /** Specific key from the secret to inject (e.g., 'username', 'password'). Required by some providers like BasicAuthSecretProvider */
      key?: Key;
    } & BaseSecretInjectionStrategy)
  | ({
      /** Injection strategy type: volume mount injection */
      kind: 'volume';
      /** Path where the secret volume should be mounted in the container (required) */
      mountPath: string;
      /** Zero-based index of the container to inject into (default: 0) */
      containerIndex?: number;
    } & BaseSecretInjectionStrategy)
  | ({
      /** Injection strategy type: annotation injection */
      kind: 'annotation';
    } & BaseSecretInjectionStrategy)
  | ({
      /** Injection strategy type: image pull secret injection for private registry authentication */
      kind: 'imagePullSecret';
    } & BaseSecretInjectionStrategy)
  | ({
      /** Injection strategy type: bulk environment variable injection using envFrom */
      kind: 'envFrom';
      /** Zero-based index of the container to inject into (default: 0) */
      containerIndex?: number;
      /** Prefix to add to all environment variable names (e.g., 'DB_' results in 'DB_username', 'DB_password') */
      prefix?: string;
    } & BaseSecretInjectionStrategy)
  | {
      /**
       * Injection strategy type: custom plugin-defined injection
       *
       * Noted: This kind is not implemented yet, checkout the issue: https://github.com/thaitype/kubricate/issues/84
       **/
      kind: 'plugin';
      /** Custom action identifier for the plugin */
      action?: string;
      /** Arguments to pass to the plugin */
      args?: unknown[];
      /** Additional plugin-specific fields */
      [key: string]: unknown;
    };
