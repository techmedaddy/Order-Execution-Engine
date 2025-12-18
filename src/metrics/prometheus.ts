import client from "prom-client";

client.collectDefaultMetrics();

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request latency",
  labelNames: ["method", "route", "status"],
  buckets: [50, 100, 200, 300, 500, 1000, 2000],
});

export const ordersCreated = new client.Counter({
  name: "orders_created_total",
  help: "Total number of orders created",
});

export const queueDepth = new client.Gauge({
  name: "order_queue_depth",
  help: "Current BullMQ queue depth",
});

export const workersActive = new client.Gauge({
  name: "order_workers_active",
  help: "Active BullMQ workers",
});

export const register = client.register;
