import { pgPool } from '../config/postgres';
import { Order } from '../domain/order.entity';
import { OrderStatus } from '../domain/order.types';

// Required SQL: ALTER TABLE orders ADD COLUMN idempotency_key TEXT UNIQUE;

export async function createOrder(order: Order): Promise<string> {
  if (order.idempotencyKey) {
    const result = await pgPool.query(
      `INSERT INTO orders (id, payload, status, created_at, updated_at, idempotency_key) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [order.id, order.payload, order.status, order.createdAt, order.updatedAt, order.idempotencyKey]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Duplicate request: fetch existing order ID
    const existing = await pgPool.query(
      'SELECT id FROM orders WHERE idempotency_key = $1',
      [order.idempotencyKey]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
  }

  await pgPool.query(
    'INSERT INTO orders (id, payload, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
    [order.id, order.payload, order.status, order.createdAt, order.updatedAt]
  );

  return order.id;
}

export async function createOrGetByIdempotencyKey(
  order: Order,
  idempotencyKey: string
): Promise<{ orderId: string }> {
  const result = await pgPool.query(
    `INSERT INTO orders (id, payload, status, created_at, updated_at, idempotency_key) 
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id`,
    [order.id, order.payload, order.status, order.createdAt, order.updatedAt, idempotencyKey]
  );

  if (result.rows.length > 0) {
    return { orderId: result.rows[0].id };
  }

  const existing = await pgPool.query(
    'SELECT id FROM orders WHERE idempotency_key = $1',
    [idempotencyKey]
  );

  if (existing.rows.length > 0) {
    return { orderId: existing.rows[0].id };
  }

  throw new Error('Order creation failed: Idempotency key conflict but order not found');
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await pgPool.query(
    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, orderId]
  );
}

export async function transitionToTerminalStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  const result = await pgPool.query(
    `UPDATE orders 
     SET status = $1, updated_at = NOW() 
     WHERE id = $2 AND status = 'EXECUTING'
     RETURNING id`,
    [status, orderId]
  );
  return (result.rowCount ?? 0) > 0;
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

export async function claimOrderForExecution(orderId: string): Promise<Order | null> {
  const result = await pgPool.query(
    `UPDATE orders 
     SET status = 'EXECUTING', updated_at = NOW() 
     WHERE id = $1 AND status = 'QUEUED' 
     RETURNING id, payload, status, created_at, updated_at, idempotency_key`,
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
    updatedAt: row.updated_at,
    idempotencyKey: row.idempotency_key
  };
}