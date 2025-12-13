import { ExecuteOrderRequestSchema } from './orders.schema';
import { executeOrderService } from './orders.service';

export async function executeOrderController(request: any, reply: any): Promise<void> {
  const idempotencyKey = request.headers['idempotency-key'];

  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
    reply.code(400).send({ error: 'Idempotency-Key header is required' });
    return;
  }

  const body = ExecuteOrderRequestSchema.parse(request.body);

  const orderId = await executeOrderService(body, idempotencyKey);

  reply.code(202).send({ orderId });
}