import { OrderPayload, OrderStatus } from './order.types';

export interface Order {
  id: string;
  payload: OrderPayload;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey?: string;
}

export function createOrder(id: string, payload: OrderPayload, idempotencyKey?: string): Order {
  const now = new Date();
  return {
    id,
    payload,
    status: OrderStatus.CREATED,
    createdAt: now,
    updatedAt: now,
    idempotencyKey
  };
}

export function transitionOrderStatus(
  order: Order,
  nextStatus: OrderStatus
): Order {
  return {
    ...order,
    status: nextStatus,
    updatedAt: new Date()
  };
}