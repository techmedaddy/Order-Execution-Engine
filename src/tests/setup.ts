import { app } from '../app';
import { pgPool } from '../config/postgres';

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await pgPool.end();
  await app.close();
});

beforeEach(async () => {
  await pgPool.query('DELETE FROM orders');
});
