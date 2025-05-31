import type { BaseStack } from './BaseStack.js';
import type { ProjectGenerateOptions } from './generate/types.js';
import { ResourceComposer } from './ResourceComposer.js';
import type { ProjectSecretOptions } from './secret/types.js';

export type FunctionLike<Params extends unknown[] = [], Return = unknown> = (...args: Params) => Return;
export type AnyFunction = FunctionLike<unknown[], unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyClass = { new(...args: any[]): any };

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

/**
 * Accept any type of key, including string, number, or symbol, Like `keyof any`.
 * This is useful for generic programming where the key type is not known in advance.
 * It allows for more flexibility in defining data structures and algorithms that can work with different key types.
 */
export type AnyKey = string | number | symbol;

/**
 * Check is the type is never, return true if the type is never, false otherwise.
 */
export type IsNever<T> = [T] extends [never] ? true : false;
/**
 * FallbackIfNever checks if the type T is never, and if so, returns the fallback type.
 * Otherwise, it returns the original type T.
 */
export type FallbackIfNever<T, Fallback> = IsNever<T> extends true ? Fallback : T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferConfigureComposerFunc<T> = T extends (...args: any[]) => ResourceComposer<infer R> ? R : never;
/**
 * Any String for literal types without losing autocompletion.
 */
export type AnyString = string & {};

/**
 * Metadata configuration for project-wide resource generation behavior.
 */
export interface ProjectMetadataOptions {
  /**
   * Whether to automatically inject standard Kubricate metadata
   * (such as labels and annotations) into every generated resource.
   * If `true`, Kubricate will inject fields like `stack-id`, `stack-name`, `version`, and `managed-at`.
   * Defaults to `true` if omitted.
   * 
  * @default true
   */
  inject?: boolean;
  /**
   * Whether to inject the 'managed-at' annotation into each generated resource.
   * If false, Kubricate will omit the 'kubricate.thaitype.dev/managed-at' field.
   *
   * Defaults to `true`.
   * 
   * @default true
   */
  injectManagedAt?: boolean;

  /**
   * Whether to inject the 'resource-hash' annotation into each generated resource.
   * 
   * When enabled, Kubricate will calculate a stable hash of the resource content
   * (excluding dynamic fields like 'managed-at') and inject it into
   * the annotation 'kubricate.thaitype.dev/resource-hash'.
   * 
   * Useful for GitOps and drift detection tools to track changes in resource specifications.
   * 
   * Defaults to `true` if omitted.
   * 
   * @default true
   */
  injectResourceHash?: boolean;
  /**
   * Whether to inject the 'version' annotation into each generated resource.
   * 
   * When enabled, Kubricate will inject the CLI framework version
   * (e.g., `0.17.0`) into the annotation 'kubricate.thaitype.dev/version'.
   * 
   * Useful for tracking which Kubricate version was used to generate the manifest,
   * which can assist in debugging, auditing, or reproducing environments.
   * 
   * Defaults to `true` if omitted.
   * 
   * @default true
   */
  injectVersion?: boolean;
}

export interface KubricateConfig {
  stacks?: Record<string, BaseStack>;
  metadata?: ProjectMetadataOptions;
  /**
   * Secrets configuration
   */
  secret?: ProjectSecretOptions;
  generate?: ProjectGenerateOptions;
}

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface BaseLogger {
  level: LogLevel;
  log(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export class SilentLogger implements BaseLogger {
  level: LogLevel = 'silent';
  log() { }
  info() { }
  warn() { }
  error() { }
  debug() { }
}
