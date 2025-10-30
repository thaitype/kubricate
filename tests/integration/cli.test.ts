import { describe, expect, it } from 'vitest';

import { executeKubricate } from '../helpers/execute-kubricate';

const scenarios = [
  { name: 'Run no command', args: [], expectExitCode: 0 },
  { name: 'Run no command with --help option', args: ['--help'], expectExitCode: 0 },
  { name: 'Run no command with --h option', args: ['-h'], expectExitCode: 0 },
];

describe.each(scenarios)('CLI output display ($name)', ({ args, expectExitCode }) => {
  it('should display expected output', async () => {
    const { all, exitCode } = await executeKubricate(args, { all: true, reject: false });

    expect(exitCode).toBe(expectExitCode);
    expect(all).toMatchSnapshot();
  });
});
