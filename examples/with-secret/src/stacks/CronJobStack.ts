import { createStack, ResourceComposer } from 'kubricate';
import { CronJob } from 'kubernetes-models/batch/v1';

export interface MyInput {
  name: string;
}

/**
 * This cannot be used in real world, because the cronjob is not configured
 */
export const CronJobStack = createStack('CronJob', (data: MyInput) => {
  return new ResourceComposer().addClass({
    id: 'cronJob',
    type: CronJob,
    config: {
      metadata: { name: data.name },
    },
  });
});
