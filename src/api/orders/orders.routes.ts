import { executeOrderController, getOrderController, resetController, listOrdersController } from './orders.controller';

export function registerOrderRoutes(fastify: any): void {
  // List all orders (must come before /:id to avoid route collision)
  fastify.get('/api/orders', listOrdersController);
  
  // POST /api/orders - alias for /api/orders/execute to match frontend contract
  fastify.post('/api/orders', executeOrderController);
  
  // Legacy endpoint maintained for backward compatibility
  fastify.post('/api/orders/execute', executeOrderController);
  
  fastify.get('/api/orders/:id', getOrderController);
  
  // Register a custom JSON parser that allows empty bodies for /api/reset
  // Frontend sends Content-Type: application/json with no/empty payload
  // Fastify's default JSON parser rejects empty bodies (FST_ERR_CTP_EMPTY_JSON_BODY)
  fastify.register(async function resetRoutePlugin(fastifyInstance: any) {
    // Add a custom content-type parser for application/json within this plugin scope
    fastifyInstance.addContentTypeParser('application/json', { parseAs: 'string' }, function (req: any, body: string, done: any) {
      try {
        // Allow empty bodies to be treated as {}
        const json = body.trim() === '' || body.trim() === '{}' ? {} : JSON.parse(body);
        done(null, json);
      } catch (err) {
        done(err);
      }
    });
    
    // Register the reset route within the plugin (uses scoped parser)
    fastifyInstance.post('/api/reset', resetController);
  });
}
