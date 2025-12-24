import { ExecuteOrderRequestSchema } from './orders.schema';
import { executeOrderService, resetSystemState } from './orders.service';
import { ordersCreatedTotal } from '../../metrics/prometheus';
import { findOrderById } from '../../persistence/order.repository';
import { ZodError } from 'zod';

export async function executeOrderController(
  request: any,
  reply: any
): Promise<void> {
  const idempotencyKey = request.headers['idempotency-key'];

  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
    reply.code(400).send({ error: 'Idempotency-Key header is required' });
    return;
  }

  let body;
  try {
    body = ExecuteOrderRequestSchema.parse(request.body);
  } catch (err) {
    if (err instanceof ZodError) {
      reply.code(400).send({
        error: 'Invalid request payload',
        details: err.issues,
      });
      return;
    }
    throw err;
  }

  // ✅ METRIC: order creation
  ordersCreatedTotal.inc();

  const orderId = await executeOrderService(body, idempotencyKey);

  reply.code(202).send({ orderId });
}

export async function getOrderController(
  request: any,
  reply: any
): Promise<void> {
  const { id } = request.params;

  const order = await findOrderById(id);

  if (!order) {
    reply.code(404).send({ error: 'Order not found' });
    return;
  }

  reply.send({
    orderId: order.id,
    payload: order.payload,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
}

export async function resetController(
  request: any,
  reply: any
): Promise<void> {
  try {
    await resetSystemState();
    reply.code(200).send({ 
      ok: true,
      message: 'System state reset successfully'
    });
  } catch (error) {
    reply.code(500).send({ 
      ok: false,
      error: 'Failed to reset system state',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
