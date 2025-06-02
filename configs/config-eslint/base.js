import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';
import onlyWarn from 'eslint-plugin-only-warn';
import perfectionist from 'eslint-plugin-perfectionist';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  // {
  //   plugins: {
  //     perfectionist,
  //   },
  //   rules: {
  //     'perfectionist/sort-imports': [
  //       'error',
  //       {
  //         type: 'alphabetical',
  //         order: 'asc',
  //         fallbackSort: { type: 'unsorted' },
  //         ignoreCase: true,
  //         specialCharacters: 'keep',
  //         internalPattern: ['^@kubricate/.+'],
  //         partitionByComment: false,
  //         partitionByNewLine: false,
  //         newlinesBetween: 'always',
  //         maxLineLength: undefined,
  //         groups: [
  //           'type-import',
  //           ['value-builtin', 'value-external'],
  //           'type-internal',
  //           'value-internal',
  //           ['type-parent', 'type-sibling', 'type-index'],
  //           ['value-parent', 'value-sibling', 'value-index'],
  //           'ts-equals-import',
  //           'unknown',
  //         ],
  //         customGroups: [],
  //         environment: 'node',
  //       },
  //     ],
  //   },
  // },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ['dist/**'],
  },
];
