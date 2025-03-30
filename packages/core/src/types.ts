import { ManifestComposer } from './ManifestComposer.js';

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

export type InferResourceBuilder<T> = T extends ManifestComposer<infer R> ? R : never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferResourceBuilderFunction<T> = T extends (...args: any[]) => ManifestComposer<infer R> ? R : never;
/**
 * Any String for literal types without losing autocompletion.
 */
export type AnyString = string & {};
