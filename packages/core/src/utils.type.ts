/**
 * Type-level assertion utility.
 *
 * Ref: https://github.com/type-challenges/type-challenges/blob/main/utils/index.d.ts
 */

export type Expect<T extends true> = T;

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
