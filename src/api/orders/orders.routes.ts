import { executeOrderController, getOrderController } from './orders.controller';

export function registerOrderRoutes(fastify: any): void {
  fastify.post('/api/orders/execute', executeOrderController);
  fastify.get('/api/orders/:id', getOrderController);
}