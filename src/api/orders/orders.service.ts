import { randomUUID } from 'crypto';
import { ExecuteOrderRequest } from './orders.schema';
import { orderQueue } from '../../queue/order.queue';
import { createOrder } from '../../domain/order.entity';
import { createOrder as persistOrder, updateOrderStatus } from '../../persistence/order.repository';
import { OrderType, OrderStatus } from '../../domain/order.types';
import { publishOrderEvent } from '../../websocket/ws.publisher';

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
    // Emit CREATED event
    publishOrderEvent(orderId, null, OrderStatus.CREATED);

    await updateOrderStatus(orderId, OrderStatus.QUEUED);
    // Emit QUEUED event
    publishOrderEvent(orderId, OrderStatus.CREATED, OrderStatus.QUEUED);
    
    await orderQueue.add('execute-order', {
      orderId,
      payload
    });
  }

  return persistedOrderId;
}
