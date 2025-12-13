import { OrderStatus } from './order.types';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ROUTING],
  [OrderStatus.ROUTING]: [OrderStatus.BUILDING, OrderStatus.FAILED],
  [OrderStatus.BUILDING]: [OrderStatus.SUBMITTED, OrderStatus.FAILED],
  [OrderStatus.SUBMITTED]: [OrderStatus.CONFIRMED, OrderStatus.FAILED],
  [OrderStatus.CONFIRMED]: [],
  [OrderStatus.FAILED]: []
};

export function isValidTransition(
  current: OrderStatus,
  next: OrderStatus
): boolean {
  const allowed = ALLOWED_TRANSITIONS[current];
  return allowed.includes(next);
}

export function assertValidTransition(
  current: OrderStatus,
  next: OrderStatus
): void {
  if (!isValidTransition(current, next)) {
    throw new Error(`Invalid transition from ${current} to ${next}`);
  }
}