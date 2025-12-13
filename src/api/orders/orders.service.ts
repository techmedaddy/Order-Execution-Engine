import { randomUUID } from 'crypto';
import { ExecuteOrderRequest } from './orders.schema';
import { orderQueue } from '../../queue/order.queue';
import { createOrder } from '../../domain/order.entity';
import { createOrder as persistOrder } from '../../persistence/order.repository';
import { OrderType } from '../../domain/order.types';

export async function executeOrderService(
  body: ExecuteOrderRequest,
  idempotencyKey: string
): Promise<string> {
  const orderId = randomUUID();

  const payload = {
    baseToken: body.baseToken,
    quoteToken: body.quoteToken,
    amount: body.amount,
    type: OrderType.MARKET
  };

  // Attempt to create a new order using the provided idempotencyKey
  const order = createOrder(orderId, payload, idempotencyKey);

  // Enforce idempotency using the database constraint
  // If insert succeeds, returns the newly created orderId
  // If insert fails due to uniqueness conflict, returns the existing orderId
  const persistedOrderId = await persistOrder(order);

  // Only queue if this is a new order (persisted ID matches generated ID)
  if (persistedOrderId === orderId) {
    await orderQueue.add('execute-order', {
      orderId,
      payload
    });
  }

  return persistedOrderId;
}
