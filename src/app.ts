import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { registerOrderRoutes } from './api/orders/orders.routes';
import { registerWebSocketServer } from './websocket/ws.server';
import { register } from './metrics/prometheus';

console.log('APP.TS LOADED');

export const app = Fastify({
  logger: false,
});

// Allow CORS from localhost:3234 (and 127.0.0.1)
app.register(fastifyCors, {
  origin: [
    'http://localhost:3234',
    'http://127.0.0.1:3234',
  ],
});

app.get('/health', async () => {
  return { ok: true };
});

app.get('/metrics', async (_req, reply) => {
  reply
    .header('Content-Type', register.contentType)
    .send(await register.metrics());
});

registerWebSocketServer(app);
registerOrderRoutes(app);
