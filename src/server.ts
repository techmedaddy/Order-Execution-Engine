import { app } from './app';
import { env } from './config/env';
import { checkPostgresConnection } from './config/postgres';
import './queue/order.worker'; // side-effect import

console.log('SERVER.TS BOOT');

async function start() {
  try {
    await checkPostgresConnection();

    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    console.log(`Server listening on port ${env.PORT}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();
