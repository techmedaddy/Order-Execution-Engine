import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { ExecuteOrderJob } from './job.types';
import { executeOrder } from '../execution/order.executor';
import { workersActive } from '../metrics/prometheus';

export const orderWorker = new Worker<ExecuteOrderJob>(
  'order-execution',
  async (job) => {
    const start = Date.now();

    workersActive.inc();

    console.log(
      `[WORKER START] jobId=${job.id} orderId=${job.data.orderId} pid=${process.pid}`
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      await executeOrder(job.data);
    } finally {
      workersActive.dec();
    }

    console.log(
      `[WORKER END] jobId=${job.id} orderId=${job.data.orderId} duration=${Date.now() - start}ms`
    );
  },
  {
    connection: redis,
    concurrency: 10, // set to 1 to demo backpressure
  }
);
