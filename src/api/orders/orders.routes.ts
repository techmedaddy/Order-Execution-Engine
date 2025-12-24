import { executeOrderController, getOrderController, resetController } from './orders.controller';

export function registerOrderRoutes(fastify: any): void {
  fastify.post('/api/orders/execute', executeOrderController);
  fastify.get('/api/orders/:id', getOrderController);
  fastify.post('/api/reset', resetController);
}
