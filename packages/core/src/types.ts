import { KubricateComposer } from './KubricateComposer.js';

export type FunctionLike<Params extends unknown[] = [], Return = unknown> = (...args: Params) => Return;
export type AnyFunction = FunctionLike<unknown[], unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyClass = { new (...args: any[]): any };

export type InferResourceBuilder<T> = T extends KubricateComposer<infer R> ? R : never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferResourceBuilderFunction<T> = T extends (...args: any[]) => KubricateComposer<infer R> ? R : never;
