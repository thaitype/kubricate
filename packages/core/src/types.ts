import type { BaseStack } from './BaseStack.js';
import type { ProjectGenerateOptions } from './generate/types.js';
import { ResourceComposer } from './ResourceComposer.js';
import type { ProjectSecretOptions } from './secret/types.js';

export type FunctionLike<Params extends unknown[] = [], Return = unknown> = (...args: Params) => Return;
export type AnyFunction = FunctionLike<unknown[], unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyClass = { new (...args: any[]): any };

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


export interface KubricateConfig {
  stacks?: Record<string, BaseStack>;
  /**
   * Secrets configuration
   * 
   * @deprecated Use `secret` instead
   */
  secrets?: ProjectSecretOptions;
  /**
   * Secret configuration
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
  log() {}
  info() {}
  warn() {}
  error() {}
  debug() {}
}
