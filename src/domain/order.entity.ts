import { OrderPayload, OrderStatus } from './order.types';

export interface Order {
  id: string;
  payload: OrderPayload;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export function createOrder(id: string, payload: OrderPayload): Order {
  const now = new Date();
  return {
    id,
    payload,
    status: OrderStatus.PENDING,
    createdAt: now,
    updatedAt: now
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