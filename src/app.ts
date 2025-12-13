import Fastify from 'fastify';
import { registerOrderRoutes } from './api/orders/orders.routes';
import { registerWebSocketServer } from './websocket/ws.server';

export const app = Fastify({
  logger: false
});

registerWebSocketServer(app);
registerOrderRoutes(app);