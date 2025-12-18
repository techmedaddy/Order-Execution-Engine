import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { ExecuteOrderJob } from './job.types';
import { executeOrder } from '../execution/order.executor';
import { workersActive, queueDepth } from '../metrics/prometheus';

export const orderWorker = new Worker<ExecuteOrderJob>(
  'order-execution',
  async (job) => {
    const start = Date.now();

    // Instrument workers active
    workersActive.inc();

    console.log(
      `[WORKER START] jobId=${job.id} ` +
      `orderId=${job.data.orderId} ` +
      `pid=${process.pid} ` +
      `time=${new Date().toISOString()}`
    );

    // Artificial delay to make concurrency / backpressure visible
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      await executeOrder(job.data);
    } finally {
      // Decrement active workers and queued depth regardless of success
      workersActive.dec();
      queueDepth.dec();
    }
    console.log(
      `[WORKER END]   jobId=${job.id} ` +
      `orderId=${job.data.orderId} ` +
      `pid=${process.pid} ` +
      `duration=${Date.now() - start}ms`
    );
  },
  {
    connection: redis,

    // 🔁 CHANGE THIS VALUE TO DEMONSTRATE BEHAVIOR
    // concurrency: 10  → parallel execution
    // concurrency: 1   → queue backpressure (sequential)
    concurrency: 10
  }
);
