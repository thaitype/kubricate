import { CronJob } from 'kubernetes-models/batch/v1';
import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

export interface MyInput {
  name: string;
}

/**
 * This cannot be used in real world, because the cronjob is not configured.
 */
export const cronJobTemplate = defineStackTemplate('CronJob', (data: MyInput) => {
  return {
    cronJob: kubeModel(CronJob, {
      metadata: {
        name: data.name,
      },
    }),
  };
});