// execa-executor.ts
import { execa } from 'execa';

export class ExecaExecutor {
  async run(command: string, args: string[]): Promise<void> {
    await execa(command, args, { stdio: 'inherit' });
  }
}
