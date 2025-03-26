import { KubricateController } from './KubricateController.js';

export type InferResourceBuilder<T> = T extends KubricateController<infer R> ? R : never;
export type InferResourceBuilderFunction<T> = T extends (...args: any[]) => KubricateController<infer R> ? R : never;
