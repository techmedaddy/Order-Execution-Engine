import { randomUUID } from 'crypto';
import { ExecuteOrderRequest } from './orders.schema';
import { orderQueue } from '../../queue/order.queue';
import { queueDepth } from '../../metrics/prometheus';
import { createOrder as buildOrder } from '../../domain/order.entity';
import { createOrder, updateOrderStatus } from '../../persistence/order.repository';
import { OrderType, OrderStatus } from '../../domain/order.types';
import { publishOrderEvent } from '../../websocket/ws.publisher';
import { pgPool } from '../../config/postgres';
import { redis } from '../../config/redis';

export async function executeOrderService(
  body: ExecuteOrderRequest,
  idempotencyKey: string
): Promise<string> {
  const orderId = randomUUID();

  const payload = {
    baseToken: body.baseToken,
    quoteToken: body.quoteToken,
    amount: body.amount,
    type: OrderType.MARKET,
  };

  const order = buildOrder(orderId, payload, idempotencyKey);

  const persistedOrderId = await createOrder(order);

  if (persistedOrderId === orderId) {
    publishOrderEvent(orderId, null, OrderStatus.CREATED);

    await updateOrderStatus(orderId, OrderStatus.QUEUED);
    publishOrderEvent(orderId, OrderStatus.CREATED, OrderStatus.QUEUED);

    queueDepth.inc();

    await orderQueue.add('execute-order', {
      orderId,
      payload,
    });
  }

  return persistedOrderId;
}

export async function resetSystemState(): Promise<void> {
  try {
    await orderQueue.drain();
    await orderQueue.clean(0, 1000, 'completed');
    await orderQueue.clean(0, 1000, 'failed');
    await orderQueue.clean(0, 1000, 'active');
    await orderQueue.clean(0, 1000, 'wait');
    await orderQueue.clean(0, 1000, 'delayed');
  } catch {}

  try {
    const keys = await redis.keys('order:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {}

  try {
    const bullKeys = await redis.keys('bull:order-execution:*');
    if (bullKeys.length > 0) {
      await redis.del(...bullKeys);
    }
  } catch {}

  try {
    await pgPool.query('TRUNCATE TABLE orders RESTART IDENTITY CASCADE');
  } catch {}

  queueDepth.set(0);
}
