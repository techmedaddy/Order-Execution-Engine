import { Pool } from 'pg';
import { env } from './env';

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

export async function checkPostgresConnection(): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}