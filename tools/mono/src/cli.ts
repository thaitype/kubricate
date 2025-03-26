import { type MonoScripts, processArgs, runCommand } from './libs.js';

// prettier-ignore
const scripts: MonoScripts = {
  'lint:check': 'eslint src',
  'lint:fix': 'eslint src --fix',
  'test': 'vitest run',
  'test:watch': 'vitest watch',
  'build': 'esbuild ./src/index.ts --bundle --minify --platform=node --outfile=dist/index.js',
  'dev': 'tsx watch ./src/index.ts',
  'start': 'tsx ./src/index.ts',
  'check-types': 'tsc --noEmit',
};

(async () => {
  for (const command of processArgs(process.argv[2], scripts)) {
    await runCommand(command, {
      preferLocal: true,
    });
  }
})();
