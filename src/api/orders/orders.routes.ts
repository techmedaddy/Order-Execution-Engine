import { executeOrderController } from './orders.controller';

export function registerOrderRoutes(fastify: any): void {
  fastify.post('/api/orders/execute', executeOrderController);
}