import { app } from './app';
import { env } from './config/env';
import { checkPostgresConnection } from './config/postgres';
import { orderWorker } from './queue/order.worker';

console.log("SERVER.TS BOOT");

async function start() {
  try {
    await checkPostgresConnection();
    await app.listen({ port: env.PORT });
  } catch (error) {
    throw error;
  }
}

start();