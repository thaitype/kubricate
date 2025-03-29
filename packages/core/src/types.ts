import { KubricateController } from './KubricateController.js';

export type FunctionLike<Params extends unknown[] = [], Return = unknown> = (...args: Params) => Return;
export type AnyFunction = FunctionLike<unknown[], unknown>;

export type InferResourceBuilder<T> = T extends KubricateController<infer R> ? R : never;
export type InferResourceBuilderFunction<T> =
  T extends FunctionLike<unknown[], KubricateController<infer R>> ? R : never;
