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

export type SecretInjectionStrategy =
  | ({ kind: 'env'; containerIndex?: number; key?: string } & BaseSecretInjectionStrategy)
  | ({ kind: 'volume'; mountPath: string; containerIndex?: number } & BaseSecretInjectionStrategy)
  | ({ kind: 'annotation' } & BaseSecretInjectionStrategy)
  | ({ kind: 'imagePullSecret' } & BaseSecretInjectionStrategy)
  | ({ kind: 'envFrom'; containerIndex?: number; prefix?: string } & BaseSecretInjectionStrategy)
  | { kind: 'plugin'; action?: string; args?: unknown[]; [key: string]: unknown };
