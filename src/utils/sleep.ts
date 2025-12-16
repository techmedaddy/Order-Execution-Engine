/**
 * Sleep for a fixed duration.
 * Used to simulate latency and make concurrency / backpressure observable.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
