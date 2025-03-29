import { CommandModule } from 'yargs';

export const applyCommand: CommandModule = {
  command: 'apply',
  describe: 'Apply main Kubricate stack or config',
  handler: async () => {
    console.log('🧱 Applying kubricate stack...');
    // TODO: Call actual apply logic here
  },
};