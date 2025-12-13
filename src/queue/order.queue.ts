import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { ExecuteOrderJob } from './job.types';

export const orderQueue = new Queue<ExecuteOrderJob>('order-execution', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});