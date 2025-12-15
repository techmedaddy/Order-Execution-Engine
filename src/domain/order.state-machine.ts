import { OrderStatus } from './order.types';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.QUEUED],
  [OrderStatus.QUEUED]: [OrderStatus.EXECUTING],
  [OrderStatus.EXECUTING]: [OrderStatus.SUCCESS, OrderStatus.FAILED],
  [OrderStatus.SUCCESS]: [],
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

export function isTerminalState(status: OrderStatus): boolean {
  return [OrderStatus.SUCCESS, OrderStatus.FAILED].includes(status);
}