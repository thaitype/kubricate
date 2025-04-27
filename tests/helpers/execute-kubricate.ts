import { execa, Options } from 'execa';

export async function executeKubricate(args: string[], options?: Options) {
  return execa('kubricate', args, options);
}

