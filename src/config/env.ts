import dotenv from 'dotenv';

dotenv.config();

export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  REDIS_URL: string;
  DATABASE_URL: string;
}

const { NODE_ENV, PORT, REDIS_URL, DATABASE_URL } = process.env;

if (!NODE_ENV || (NODE_ENV !== 'development' && NODE_ENV !== 'test' && NODE_ENV !== 'production')) {
  throw new Error('NODE_ENV is missing or invalid');
}

if (!PORT) {
  throw new Error('PORT is missing');
}

const parsedPort = parseInt(PORT, 10);

if (isNaN(parsedPort)) {
  throw new Error('PORT must be a number');
}

if (!REDIS_URL) {
  throw new Error('REDIS_URL is missing');
}

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is missing');
}

export const env: EnvConfig = {
  NODE_ENV: NODE_ENV as EnvConfig['NODE_ENV'],
  PORT: parsedPort,
  REDIS_URL,
  DATABASE_URL
};