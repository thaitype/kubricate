import { runScript, type MonoScripts } from '@thaitype/mono-scripts';

const binName = 'mono';

// prettier-ignore
const scripts: MonoScripts = {
  // Lint Scripts
  'lint:check': 'eslint src --max-warnings 0',
  'lint:fix': 'eslint src --fix --max-warnings 0',

  // Test Scripts
  'test': 'vitest run',
  'test:integration': 'vitest run --no-file-parallelism',
  'test:watch': 'vitest watch',

  // Build in order: ESM, CJS, Annotate for support dual package both ESM and CJS
  'build': [`${binName} build-esm`, `${binName} build-cjs`, `${binName} build-annotate`],
  'build-esm': 'tsc',
  'build-cjs': 'babel dist/esm --plugins @babel/transform-export-namespace-from --plugins @babel/transform-modules-commonjs --out-dir dist/cjs --source-maps',
  'build-annotate': 'babel dist --plugins annotate-pure-calls --out-dir dist --source-maps',
  // Compile TypeScript in watch mode
  'dev': 'tsc -w',
  // Check TypeScript types
  'check-types': 'tsc --noEmit',

  'start': 'echo "No start script"',
};

runScript(scripts, { preferLocal: true });
