
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
  | { kind: 'env'; containerIndex?: number } & BaseSecretInjectionStrategy
  | { kind: 'volume'; mountPath: string; containerIndex?: number } & BaseSecretInjectionStrategy
  | { kind: 'annotation' } & BaseSecretInjectionStrategy
  | { kind: 'imagePullSecret' } & BaseSecretInjectionStrategy
  | { kind: 'envFrom'; containerIndex?: number } & BaseSecretInjectionStrategy
  | { kind: 'plugin'; action?: string; args?: unknown[]; [key: string]: unknown; };
