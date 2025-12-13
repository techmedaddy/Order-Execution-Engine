import { pgPool } from '../config/postgres';
import { Order } from '../domain/order.entity';
import { OrderStatus } from '../domain/order.types';

export async function createOrder(order: Order): Promise<void> {
  await pgPool.query(
    'INSERT INTO orders (id, payload, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
    [order.id, order.payload, order.status, order.createdAt, order.updatedAt]
  );
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await pgPool.query(
    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, orderId]
  );
}

export async function findOrderById(orderId: string): Promise<Order | null> {
  const result = await pgPool.query(
    'SELECT id, payload, status, created_at, updated_at FROM orders WHERE id = $1',
    [orderId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    payload: row.payload,
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}