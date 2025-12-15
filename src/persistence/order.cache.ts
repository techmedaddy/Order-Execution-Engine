import { redis } from '../config/redis';
import { OrderStatus } from '../domain/order.types';

export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await redis.hset(`order:${orderId}`, 'status', status);
}

export async function getOrderStatus(orderId: string): Promise<OrderStatus | null> {
  const status = await redis.hget(`order:${orderId}`, 'status');
  return status as OrderStatus | null;
}

export async function deleteOrder(orderId: string): Promise<void> {
  await redis.del(`order:${orderId}`);
}