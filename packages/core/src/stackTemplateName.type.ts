// stackTemplateName.ts

import type { Equal, Expect } from "./utils.type.js";

// ==============================
// 1. Primitive character types
// ==============================

type LowerAlpha =
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j'
  | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't'
  | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';

type Digit =
  | '0' | '1' | '2' | '3' | '4'
  | '5' | '6' | '7' | '8' | '9';

type AllowedChar = LowerAlpha | Digit | '.' | '_' | '-';

// ==============================
// 2. Segment validation
//    - non-empty
//    - every char in AllowedChar
// ==============================

type IsValidSegment<S extends string> =
  S extends ''
    ? false
    : S extends `${infer C}${infer Rest}`
      ? C extends AllowedChar
        ? Rest extends ''
          ? true
          : IsValidSegment<Rest>
        : false
      : false;

// ==============================
// 3. Pattern validation
//    Forms:
//      1) <templateName>
//      2) @<org>/<templateName>
//      3) @<org>/<packageName>/<templateName>
// ==============================

type IsPlainTemplateName<S extends string> =
  IsValidSegment<S>;

type IsOrgTemplateName<S extends string> =
  S extends `@${infer Org}/${infer Template}`
    ? IsValidSegment<Org> extends true
      ? IsValidSegment<Template> extends true
        ? true
        : false
      : false
    : false;

type IsOrgPackageTemplateName<S extends string> =
  S extends `@${infer Org}/${infer Pkg}/${infer Template}`
    ? IsValidSegment<Org> extends true
      ? IsValidSegment<Pkg> extends true
        ? IsValidSegment<Template> extends true
          ? true
          : false
        : false
      : false
    : false;

type IsStackTemplateName<S extends string> =
  IsOrgPackageTemplateName<S> extends true
    ? true
    : IsOrgTemplateName<S> extends true
      ? true
      : IsPlainTemplateName<S> extends true
        ? true
        : false;

export type InvalidTemplateNameError = 'Invalid Stack Template Name: Support only forms - <templateName>, @<org>/<templateName>, @<org>/<packageName>/<templateName> with lowercase letters, digits, ".", "_", "-" only.';

// ==============================
// 4. Public type
// ==============================

export type StackTemplateName<S extends string> =
  IsStackTemplateName<S> extends true ? S : InvalidTemplateNameError;

// ==============================
// 6. Test Cases
// ==============================

// ✅ valid
export type ValidTestCases = [
  Expect<Equal<StackTemplateName<'simple-app'>, 'simple-app'>>,
  Expect<Equal<StackTemplateName<'@acme/simple-app'>, '@acme/simple-app'>>,
  Expect<Equal<StackTemplateName<'@acme/app-stacks/simple-app'>, '@acme/app-stacks/simple-app'>>,
];

export type InvalidTestCases = [
  // Invalid cases should resolve to 'never', e.g. Capital letters are not allowed
  Expect<Equal<StackTemplateName<'SimpleApp'>, InvalidTemplateNameError>>,
  // Invalid cases should resolve to 'never', e.g. Missing template name
  Expect<Equal<StackTemplateName<'@acme'>, InvalidTemplateNameError>>,
  // Invalid cases should resolve to 'never', e.g. Invalid character '$'
  Expect<Equal<StackTemplateName<'@acme/app$stacks/simple-app'>, InvalidTemplateNameError>>,
];