import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { ExecuteOrderJob } from './job.types';

export const orderQueue = new Queue<ExecuteOrderJob>('order-execution', {
  connection: redis,
  defaultJobOptions: {
    attempts: 1, // No retries by design
    removeOnComplete: true,
    removeOnFail: false
  }
});