import { ResourceBuilder } from './ResourceBuilder.js';

export type InferResourceBuilder<T> = T extends ResourceBuilder<infer R> ? R : never;
export type InferResourceBuilderFunction<T> = T extends (...args: any[]) => ResourceBuilder<infer R> ? R : never;
