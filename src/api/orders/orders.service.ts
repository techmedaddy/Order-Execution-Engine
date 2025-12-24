import { randomUUID } from 'crypto';
import { ExecuteOrderRequest } from './orders.schema';
import { orderQueue } from '../../queue/order.queue';
import { queueDepth } from '../../metrics/prometheus';
import { createOrder } from '../../domain/order.entity';
import { createOrder as persistOrder, updateOrderStatus } from '../../persistence/order.repository';
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
    
    // Instrument: increment queue depth when enqueuing job
    queueDepth.inc();

    await orderQueue.add('execute-order', {
      orderId,
      payload
    });
  }

  return persistedOrderId;
}

export async function resetSystemState(): Promise<void> {
  // 1. Drain and clean BullMQ queue
  try {
    await orderQueue.drain();
    await orderQueue.clean(0, 1000, 'completed');
    await orderQueue.clean(0, 1000, 'failed');
    await orderQueue.clean(0, 1000, 'active');
    await orderQueue.clean(0, 1000, 'wait');
    await orderQueue.clean(0, 1000, 'delayed');
  } catch (err) {
    // Queue might be empty, continue
  }

  // 2. Clear all Redis keys related to orders
  try {
    const keys = await redis.keys('order:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    // No keys found, continue
  }

  // 3. Clear BullMQ-specific Redis keys
  try {
    const bullKeys = await redis.keys('bull:order-execution:*');
    if (bullKeys.length > 0) {
      await redis.del(...bullKeys);
    }
  } catch (err) {
    // No keys found, continue
  }

  // 4. Truncate the orders table in PostgreSQL
  try {
    await pgPool.query('TRUNCATE TABLE orders RESTART IDENTITY CASCADE');
  } catch (err) {
    // Table might not exist or already empty, continue
  }

  // 5. Reset queue depth metric to zero
  queueDepth.set(0);
}
