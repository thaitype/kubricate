import { execa, Options } from 'execa';

export async function executeKubricate(args: string[], options?: Options) {
  return execa('kubricate', args, options);
}

/**
 * Execute `kubricate generate` with options
 */
export async function runGenerate({
  root,
  stdout = false,
  filters = [],
}: {
  root: string;
  stdout?: boolean;
  filters?: string[];
}) {
  const args = ['generate', '--root', root];

  if (stdout) {
    args.push('--stdout');
  }

  for (const filter of filters) {
    args.push('--filter', filter);
  }

  return await executeKubricate(args, { reject: false });
}
