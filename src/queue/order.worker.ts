import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { ExecuteOrderJob } from './job.types';
import { executeOrder } from '../execution/order.executor';

export const orderWorker = new Worker<ExecuteOrderJob>(
  'order-execution',
  async (job) => {
    await executeOrder(job.data);
  },
  {
    connection: redis,
    concurrency: 10
  }
);