import { pgPool } from '../config/postgres';
import { Order } from '../domain/order.entity';
import { OrderStatus } from '../domain/order.types';

/* ---------------- CREATE ---------------- */

export async function createOrder(order: Order): Promise<string> {
  const result = await pgPool.query(
    `
    INSERT INTO orders (
      id,
      base_token,
      quote_token,
      amount,
      status,
      idempotency_key,
      created_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
    `,
    [
      order.id,
      order.payload.baseToken,
      order.payload.quoteToken,
      order.payload.amount,
      order.status,
      order.idempotencyKey,
      order.createdAt,
    ]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  const existing = await pgPool.query(
    `SELECT id FROM orders WHERE idempotency_key = $1`,
    [order.idempotencyKey]
  );

  return existing.rows[0].id;
}

/* ---------------- STATUS ---------------- */

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  await pgPool.query(
    `UPDATE orders SET status = $1 WHERE id = $2`,
    [status, orderId]
  );
}

export async function transitionToTerminalStatus(
  orderId: string,
  status: OrderStatus
): Promise<boolean> {
  const result = await pgPool.query(
    `
    UPDATE orders
    SET status = $1
    WHERE id = $2 AND status = 'EXECUTING'
    RETURNING id
    `,
    [status, orderId]
  );

  return (result.rowCount ?? 0) > 0;
}

/* ---------------- READ ---------------- */

export async function findOrderById(orderId: string): Promise<Order | null> {
  const result = await pgPool.query(
    `
    SELECT
      id,
      base_token,
      quote_token,
      amount,
      status,
      created_at,
      idempotency_key
    FROM orders
    WHERE id = $1
    `,
    [orderId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  return {
    id: row.id,
    payload: {
      baseToken: row.base_token,
      quoteToken: row.quote_token,
      amount: row.amount,
    },
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    idempotencyKey: row.idempotency_key,
  };
}

export async function findAllOrders(limit = 100): Promise<Order[]> {
  const result = await pgPool.query(
    `
    SELECT
      id,
      base_token,
      quote_token,
      amount,
      status,
      created_at,
      idempotency_key
    FROM orders
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    payload: {
      baseToken: row.base_token,
      quoteToken: row.quote_token,
      amount: row.amount,
    },
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    idempotencyKey: row.idempotency_key,
  }));
}

/* ---------------- CLAIM ---------------- */

export async function claimOrderForExecution(
  orderId: string
): Promise<Order | null> {
  const result = await pgPool.query(
    `
    UPDATE orders
    SET status = 'EXECUTING'
    WHERE id = $1 AND status = 'QUEUED'
    RETURNING
      id,
      base_token,
      quote_token,
      amount,
      status,
      created_at,
      idempotency_key
    `,
    [orderId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  return {
    id: row.id,
    payload: {
      baseToken: row.base_token,
      quoteToken: row.quote_token,
      amount: row.amount,
    },
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    idempotencyKey: row.idempotency_key,
  };
}
