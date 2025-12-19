import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  registers: [register],
});

export const ordersExecutedTotal = new client.Counter({
  name: 'orders_executed_total',
  help: 'Total number of orders executed',
  registers: [register],
});

export const orderExecutionDuration = new client.Histogram({
  name: 'order_execution_duration_seconds',
  help: 'Order execution latency',
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// 👇 REQUIRED FOR WORKER INSTRUMENTATION
export const workersActive = new client.Gauge({
  name: 'workers_active',
  help: 'Number of active order execution workers',
  registers: [register],
});

export const queueDepth = new client.Gauge({
  name: 'queue_depth',
  help: 'Number of jobs waiting in the queue',
  registers: [register],
});
